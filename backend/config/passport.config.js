const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const oauthService = require('@services/oauth.service');

/**
 * Passport OAuth 配置
 */
class PassportConfig {
  constructor() {
    this.config = null;
  }

  /**
   * 初始化 Passport 策略
   * @param {Object} config - 环境配置
   */
  initialize(config) {
    this.config = config;

    // 序列化用户
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await oauthService.findUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    // 配置各个 OAuth 策略
    this.setupGitHubStrategy();
    this.setupGoogleStrategy();
    this.setupGiteeStrategy();

    return passport;
  }

  /**
   * GitHub OAuth 策略
   */
  setupGitHubStrategy() {
    const { clientId, clientSecret, callbackURL } = this.config.oauth?.github || {};
    
    if (!clientId || !clientSecret) {
      console.log('⚠️  GitHub OAuth 未配置，跳过');
      return;
    }

    passport.use(
      new GitHubStrategy(
        {
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL || '/api/auth/github/callback',
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await oauthService.findOrCreateUser('github', profile, {
              accessToken,
              refreshToken,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    console.log('✅ GitHub OAuth 策略已配置');
  }

  /**
   * Google OAuth 策略
   */
  setupGoogleStrategy() {
    const { clientId, clientSecret, callbackURL } = this.config.oauth?.google || {};
    
    if (!clientId || !clientSecret) {
      console.log('⚠️  Google OAuth 未配置，跳过');
      return;
    }

    passport.use(
      new GoogleStrategy(
        {
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL || '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await oauthService.findOrCreateUser('google', profile, {
              accessToken,
              refreshToken,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    console.log('✅ Google OAuth 策略已配置');
  }

  /**
   * Gitee OAuth 策略（手动实现，passport-gitee 不太稳定）
   */
  setupGiteeStrategy() {
    const { clientId, clientSecret, callbackURL } = this.config.oauth?.gitee || {};
    
    if (!clientId || !clientSecret) {
      console.log('⚠️  Gitee OAuth 未配置，跳过');
      return;
    }

    // Gitee 使用自定义 OAuth2 策略
    const OAuth2Strategy = require('passport-oauth2');
    
    const strategy = new OAuth2Strategy(
      {
        authorizationURL: 'https://gitee.com/oauth/authorize',
        tokenURL: 'https://gitee.com/oauth/token',
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL || '/api/auth/gitee/callback',
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          // Gitee 需要额外请求获取用户信息
          const axios = require('axios');
          const { data: giteeProfile } = await axios.get(
            `https://gitee.com/api/v5/user?access_token=${accessToken}`
          );
          
          // 转换为标准格式
          const normalizedProfile = {
            id: giteeProfile.id.toString(),
            username: giteeProfile.login,
            displayName: giteeProfile.name,
            emails: giteeProfile.email ? [{ value: giteeProfile.email }] : [],
            photos: [{ value: giteeProfile.avatar_url }],
            profileUrl: giteeProfile.html_url,
            _raw: giteeProfile,
          };

          const user = await oauthService.findOrCreateUser('gitee', normalizedProfile, {
            accessToken,
            refreshToken,
          });
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    );
    
    // 自定义 token 请求方法，Gitee 需要 POST body 而不是 query params
    strategy._oauth2.getOAuthAccessToken = function(code, params, callback) {
      const axios = require('axios');
      
      axios.post('https://gitee.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: params.redirect_uri || callbackURL,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      .then(response => {
        const data = response.data;
        callback(null, data.access_token, data.refresh_token, data);
      })
      .catch(error => {
        console.error('Gitee token error:', error.response?.data || error.message);
        callback(error);
      });
    };
    
    passport.use('gitee', strategy);
    console.log('✅ Gitee OAuth 策略已配置');
  }
}

module.exports = new PassportConfig();
