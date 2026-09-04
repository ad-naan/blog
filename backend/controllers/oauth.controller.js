const passport = require('passport');
const crypto = require('crypto');
const oauthService = require('@services/oauth.service');
const redisManager = require('@utils/redis');
const { asyncHandler } = require('@utils/response');
const environment = require('@config/environment');

/**
 * OAuth 控制器
 * 处理第三方登录的路由回调
 */

// 绑定 state 有效期（秒）
const OAUTH_BIND_STATE_TTL = 300;

/**
 * 生成随机绑定 state（存入 Redis，5 分钟有效）
 * 修复：原先 state = `bind_${userId}` 可预测，存在 CSRF 绑定攻击风险
 */
const createBindState = async userId => {
  const nonce = crypto.randomBytes(16).toString('hex');
  await redisManager.set(`oauth:bind-state:${nonce}`, String(userId), OAUTH_BIND_STATE_TTL);
  return `bind_${nonce}`;
};

/**
 * 校验并消费绑定 state（一次性），返回 userId；无效返回 null
 */
const consumeBindState = async state => {
  if (!state || !state.startsWith('bind_')) return null;
  const nonce = state.slice('bind_'.length);
  if (!/^[a-f0-9]{32}$/.test(nonce)) return null;

  const key = `oauth:bind-state:${nonce}`;
  const value = await redisManager.get(key);
  if (!value) return null;

  // 一次性消费，防止重放
  const client = redisManager.getClient();
  await client.del(key);

  const userId = parseInt(value, 10);
  return Number.isInteger(userId) ? userId : null;
};

// 获取前端回调地址
const getFrontendCallbackUrl = () => {
  const config = environment.get();
  return config.oauth?.frontendCallbackUrl || 'http://localhost:3000/#/oauth/callback';
};

/**
 * 构建带参数的前端回调 URL（支持 hash 路由）
 */
const buildCallbackUrl = (params = {}) => {
  const baseUrl = getFrontendCallbackUrl();

  if (Object.keys(params).length === 0) {
    return baseUrl;
  }

  const queryParts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  const queryString = queryParts.join('&');

  // 对于 hash 路由，参数放在 hash 路径后面
  const finalUrl = `${baseUrl}?${queryString}`;
  console.log('OAuth redirect URL:', finalUrl);
  return finalUrl;
};

/**
 * GitHub 登录入口
 */
exports.githubLogin = (req, res, next) => {
  // 检查是否是绑定操作（已登录用户）
  const state = req.query.bind === 'true' ? 'bind' : 'login';
  
  passport.authenticate('github', {
    scope: ['user:email'],
    state,
  })(req, res, next);
};

/**
 * GitHub 登录回调（同时处理登录和绑定）
 */
exports.githubCallback = [
  (req, res, next) => {
    const state = req.query.state || '';
    
    // 绑定模式：跳过 passport，直接手动处理
    if (state.startsWith('bind_')) {
      req.oauthState = state;
      return next();
    }
    
    // 登录模式：使用 passport
    passport.authenticate('github', { session: false }, async (err, user, info) => {
      if (err) {
        return res.redirect(buildCallbackUrl({ error: err.message, provider: 'github' }));
      }
      req.user = user;
      req.oauthState = state;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    const state = req.oauthState || '';
    
    // 绑定模式 - 手动处理 OAuth 流程（state 为随机 nonce，从 Redis 校验并消费）
    if (state.startsWith('bind_')) {
      const userId = await consumeBindState(state);
      const code = req.query.code;

      if (!userId) {
        return res.redirect(buildCallbackUrl({ error: '绑定会话已过期或无效，请重新发起绑定', provider: 'github', action: 'bind' }));
      }
      if (!code) {
        return res.redirect(buildCallbackUrl({ error: '授权失败', provider: 'github', action: 'bind' }));
      }

      try {
        const config = environment.get();
        const axios = require('axios');

        // 获取 access_token
        const tokenRes = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: config.oauth.github.clientId,
            client_secret: config.oauth.github.clientSecret,
            code,
          },
          { headers: { Accept: 'application/json' } }
        );
        
        const { access_token } = tokenRes.data;
        if (!access_token) {
          return res.redirect(buildCallbackUrl({ error: '获取令牌失败', provider: 'github', action: 'bind' }));
        }
        
        // 获取用户信息
        const userRes = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        
        const profile = {
          id: userRes.data.id.toString(),
          username: userRes.data.login,
          displayName: userRes.data.name,
          emails: userRes.data.email ? [{ value: userRes.data.email }] : [],
          photos: [{ value: userRes.data.avatar_url }],
          _raw: userRes.data,
        };
        
        // 绑定到用户
        await oauthService.bindToExistingUser(userId, 'github', profile, {
          accessToken: access_token,
        });
        
        return res.redirect(buildCallbackUrl({ success: 'true', provider: 'github', action: 'bind' }));
      } catch (error) {
        console.error('GitHub bind error:', error.response?.data || error.message);
        const errorMsg = error.message || '绑定失败';
        return res.redirect(buildCallbackUrl({ error: errorMsg, provider: 'github', action: 'bind' }));
      }
    }
    
    // 登录模式
    const user = req.user;
    if (!user) {
      return res.redirect(buildCallbackUrl({ error: '认证失败', provider: 'github' }));
    }
    
    const token = await oauthService.generateTokenForUser(user);
    res.redirect(buildCallbackUrl({ token, provider: 'github', action: 'login' }));
  }),
];

/**
 * Google 登录入口
 */
exports.googleLogin = (req, res, next) => {
  const state = req.query.bind === 'true' ? 'bind' : 'login';
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
};

/**
 * Google 登录回调（同时处理登录和绑定）
 */
exports.googleCallback = [
  (req, res, next) => {
    const state = req.query.state || '';
    
    // 绑定模式：跳过 passport，直接手动处理
    if (state.startsWith('bind_')) {
      req.oauthState = state;
      return next();
    }
    
    // 登录模式：使用 passport
    passport.authenticate('google', { session: false }, async (err, user) => {
      if (err) {
        return res.redirect(buildCallbackUrl({ error: err.message, provider: 'google' }));
      }
      req.user = user;
      req.oauthState = state;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    const state = req.oauthState || '';
    
    // 绑定模式 - 手动处理 OAuth 流程（state 为随机 nonce，从 Redis 校验并消费）
    if (state.startsWith('bind_')) {
      const userId = await consumeBindState(state);
      const code = req.query.code;

      if (!userId) {
        return res.redirect(buildCallbackUrl({ error: '绑定会话已过期或无效，请重新发起绑定', provider: 'google', action: 'bind' }));
      }
      if (!code) {
        return res.redirect(buildCallbackUrl({ error: '授权失败', provider: 'google', action: 'bind' }));
      }
      
      try {
        const config = environment.get();
        const axios = require('axios');
        
        // 获取 access_token
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: config.oauth.google.clientId,
          client_secret: config.oauth.google.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.oauth.google.callbackURL,
        });
        
        const { access_token } = tokenRes.data;
        
        // 获取用户信息
        const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        
        const profile = {
          id: userRes.data.id,
          displayName: userRes.data.name,
          emails: [{ value: userRes.data.email }],
          photos: [{ value: userRes.data.picture }],
          _raw: userRes.data,
        };
        
        await oauthService.bindToExistingUser(userId, 'google', profile, {
          accessToken: access_token,
        });
        
        return res.redirect(buildCallbackUrl({ success: 'true', provider: 'google', action: 'bind' }));
      } catch (error) {
        console.error('Google bind error:', error.response?.data || error.message);
        const errorMsg = error.message || '绑定失败';
        return res.redirect(buildCallbackUrl({ error: errorMsg, provider: 'google', action: 'bind' }));
      }
    }
    
    // 登录模式
    const user = req.user;
    if (!user) {
      return res.redirect(buildCallbackUrl({ error: '认证失败', provider: 'google' }));
    }
    
    const token = await oauthService.generateTokenForUser(user);
    res.redirect(buildCallbackUrl({ token, provider: 'google', action: 'login' }));
  }),
];

/**
 * Gitee 登录入口
 */
exports.giteeLogin = (req, res, next) => {
  const state = req.query.bind === 'true' ? 'bind' : 'login';
  
  passport.authenticate('gitee', { state })(req, res, next);
};

/**
 * Gitee 登录回调（同时处理登录和绑定）
 */
exports.giteeCallback = [
  (req, res, next) => {
    const state = req.query.state || '';
    
    // 绑定模式：跳过 passport，直接手动处理
    if (state.startsWith('bind_')) {
      req.oauthState = state;
      return next();
    }
    
    // 登录模式：使用 passport
    passport.authenticate('gitee', { session: false }, async (err, user) => {
      if (err) {
        return res.redirect(buildCallbackUrl({ error: err.message, provider: 'gitee' }));
      }
      req.user = user;
      req.oauthState = state;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    const state = req.oauthState || '';
    
    // 绑定模式 - 手动处理 OAuth 流程（state 为随机 nonce，从 Redis 校验并消费）
    if (state.startsWith('bind_')) {
      const userId = await consumeBindState(state);
      const code = req.query.code;

      if (!userId) {
        return res.redirect(buildCallbackUrl({ error: '绑定会话已过期或无效，请重新发起绑定', provider: 'gitee', action: 'bind' }));
      }
      if (!code) {
        return res.redirect(buildCallbackUrl({ error: '授权失败', provider: 'gitee', action: 'bind' }));
      }
      
      try {
        const config = environment.get();
        const axios = require('axios');
        
        // 获取 access_token - Gitee 要求使用 POST 请求体
        const tokenRes = await axios.post('https://gitee.com/oauth/token', {
          grant_type: 'authorization_code',
          client_id: config.oauth.gitee.clientId,
          client_secret: config.oauth.gitee.clientSecret,
          code,
          redirect_uri: config.oauth.gitee.callbackURL,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        const { access_token } = tokenRes.data;
        
        // 获取用户信息
        const userRes = await axios.get(`https://gitee.com/api/v5/user?access_token=${access_token}`);
        
        const profile = {
          id: userRes.data.id.toString(),
          username: userRes.data.login,
          displayName: userRes.data.name,
          emails: userRes.data.email ? [{ value: userRes.data.email }] : [],
          photos: [{ value: userRes.data.avatar_url }],
          _raw: userRes.data,
        };
        
        await oauthService.bindToExistingUser(userId, 'gitee', profile, {
          accessToken: access_token,
        });
        
        return res.redirect(buildCallbackUrl({ success: 'true', provider: 'gitee', action: 'bind' }));
      } catch (error) {
        console.error('Gitee bind error:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.error_description || error.message || '绑定失败';
        return res.redirect(buildCallbackUrl({ error: errorMsg, provider: 'gitee', action: 'bind' }));
      }
    }
    
    // 登录模式
    const user = req.user;
    if (!user) {
      return res.redirect(buildCallbackUrl({ error: '认证失败', provider: 'gitee' }));
    }
    
    const token = await oauthService.generateTokenForUser(user);
    res.redirect(buildCallbackUrl({ token, provider: 'gitee', action: 'login' }));
  }),
];

/**
 * 获取 OAuth 配置状态（前端用于显示可用的登录方式）
 */
exports.getOAuthStatus = asyncHandler(async (req, res) => {
  const config = environment.get();
  const oauth = config.oauth || {};

  const status = {
    github: !!(oauth.github?.clientId && oauth.github?.clientSecret),
    google: !!(oauth.google?.clientId && oauth.google?.clientSecret),
    gitee: !!(oauth.gitee?.clientId && oauth.gitee?.clientSecret),
  };

  return res.apiSuccess(status, '获取 OAuth 状态成功');
});

/**
 * 获取用户绑定的 OAuth 账号
 */
exports.getBindings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const accounts = await oauthService.getUserOAuthAccounts(userId);
  
  return res.apiSuccess(accounts, '获取绑定账号成功');
});

/**
 * 解绑 OAuth 账号
 */
exports.unbind = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { provider } = req.params;

  if (!['github', 'google', 'gitee'].includes(provider)) {
    return res.apiValidationError([{ field: 'provider', message: '无效的提供商' }]);
  }

  await oauthService.unbindOAuthAccount(userId, provider);
  
  return res.apiSuccess(null, '解绑成功');
});

/**
 * 已登录用户绑定 GitHub
 */
exports.bindGithub = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const config = environment.get();

  // 使用与登录相同的回调地址，通过 state 区分绑定操作
  const callbackUrl = config.oauth.github.callbackURL;

  // 手动构建 GitHub 授权 URL（state 为随机 nonce，防 CSRF 绑定攻击）
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', config.oauth.github.clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', 'user:email');
  authUrl.searchParams.set('state', await createBindState(userId));

  res.redirect(authUrl.toString());
});

/**
 * 已登录用户绑定 GitHub 回调（已合并到 githubCallback）
 */
exports.bindGithubCallback = asyncHandler(async (req, res) => {
  // 绑定逻辑已合并到 githubCallback，这里重定向到主回调
  return res.redirect(`/api/auth/github/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

/**
 * 已登录用户绑定 Google
 */
exports.bindGoogle = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const config = environment.get();

  // 使用与登录相同的回调地址，通过 state 区分绑定操作
  const callbackUrl = config.oauth.google.callbackURL;

  // 手动构建 Google 授权 URL（state 为随机 nonce，防 CSRF 绑定攻击）
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.oauth.google.clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'profile email');
  authUrl.searchParams.set('state', await createBindState(userId));

  res.redirect(authUrl.toString());
});

/**
 * 已登录用户绑定 Google 回调（已合并到 googleCallback）
 */
exports.bindGoogleCallback = asyncHandler(async (req, res) => {
  return res.redirect(`/api/auth/google/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

/**
 * 已登录用户绑定 Gitee
 */
exports.bindGitee = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const config = environment.get();

  // 使用与登录相同的回调地址，通过 state 区分绑定操作
  const callbackUrl = config.oauth.gitee.callbackURL;

  // 手动构建 Gitee 授权 URL（state 为随机 nonce，防 CSRF 绑定攻击）
  const authUrl = new URL('https://gitee.com/oauth/authorize');
  authUrl.searchParams.set('client_id', config.oauth.gitee.clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', await createBindState(userId));

  res.redirect(authUrl.toString());
});

/**
 * 已登录用户绑定 Gitee 回调（已合并到 giteeCallback）
 */
exports.bindGiteeCallback = asyncHandler(async (req, res) => {
  return res.redirect(`/api/auth/gitee/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});
