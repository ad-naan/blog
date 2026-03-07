import { useEffect } from 'react';
import styled from '@emotion/styled';
import { FiGithub } from 'react-icons/fi';
import { SiGitee, SiGoogle } from 'react-icons/si';
import { useOAuth } from '@/hooks/useOAuth';
import type { OAuthProvider } from '@/types';

interface OAuthButtonsProps {
  mode?: 'login' | 'bind';
  onBindSuccess?: () => void;
}

/**
 * OAuth 第三方登录/绑定按钮组件
 */
export default function OAuthButtons({ mode = 'login', onBindSuccess }: OAuthButtonsProps) {
  const {
    oauthStatus,
    bindings,
    loading,
    fetchOAuthStatus,
    fetchBindings,
    loginWithOAuth,
    bindOAuth,
    unbindOAuth,
    isBound,
    getProviderName,
  } = useOAuth();

  useEffect(() => {
    fetchOAuthStatus();
    if (mode === 'bind') {
      fetchBindings();
    }
  }, [fetchOAuthStatus, fetchBindings, mode]);

  const providers: OAuthProvider[] = ['github', 'gitee', 'google'];

  const handleClick = (provider: OAuthProvider) => {
    console.log('handleClick:', provider, 'mode:', mode, 'isBound:', isBound(provider), 'bindings:', bindings);
    
    if (mode === 'login') {
      loginWithOAuth(provider);
    } else {
      if (isBound(provider)) {
        adnaan.modal.confirm({
          title: '确认解绑',
          content: `确定要解绑 ${getProviderName(provider)} 账号吗？`,
          onOk: async () => {
            try {
              console.log('开始解绑:', provider);
              const success = await unbindOAuth(provider);
              console.log('解绑结果:', success);
              if (success && onBindSuccess) {
                onBindSuccess();
              }
            } catch (error) {
              console.error('解绑失败:', error);
            }
          },
        });
      } else {
        bindOAuth(provider);
      }
    }
  };

  const getIcon = (provider: OAuthProvider) => {
    const icons: Record<OAuthProvider, React.ReactNode> = {
      github: <FiGithub size={18} />,
      google: <SiGoogle size={16} />,
      gitee: <SiGitee size={18} />,
    };
    return icons[provider];
  };

  const getButtonColor = (provider: OAuthProvider) => {
    const colors: Record<OAuthProvider, string> = {
      github: '#24292e',
      google: '#4285f4',
      gitee: '#c71d23',
    };
    return colors[provider];
  };

  if (!oauthStatus) {
    return null;
  }

  const availableProviders = providers.filter((p) => oauthStatus[p]);

  if (availableProviders.length === 0) {
    return null;
  }

  // 登录模式：显示图标按钮
  if (mode === 'login') {
    return (
      <SocialLoginGroup>
        {availableProviders.map((provider) => (
          <SocialButton
            key={provider}
            type="button"
            onClick={() => handleClick(provider)}
            disabled={loading}
            $color={getButtonColor(provider)}
            title={`使用 ${getProviderName(provider)} 登录`}
          >
            {getIcon(provider)}
          </SocialButton>
        ))}
      </SocialLoginGroup>
    );
  }

  // 绑定模式：显示完整按钮
  return (
    <BindButtonGroup>
      {availableProviders.map((provider) => {
        const bound = isBound(provider);
        return (
          <BindButton
            key={provider}
            onClick={() => handleClick(provider)}
            disabled={loading}
            $bound={bound}
            $color={getButtonColor(provider)}
          >
            <IconWrapper>{getIcon(provider)}</IconWrapper>
            <span>
              {bound ? `解绑 ${getProviderName(provider)}` : `绑定 ${getProviderName(provider)}`}
            </span>
            {bound && <BoundBadge>已绑定</BoundBadge>}
          </BindButton>
        );
      })}
    </BindButtonGroup>
  );
}

const SocialLoginGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
`;

const SocialButton = styled.button<{ $color: string }>`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;

  &:hover {
    background: ${(props) => props.$color};
    color: white;
    border-color: ${(props) => props.$color};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const BindButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BindButton = styled.button<{ $bound: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: ${(props) => (props.$bound ? 'var(--bg-secondary)' : 'var(--bg-primary)')};
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$bound ? 'var(--bg-tertiary)' : props.$color)};
    color: ${(props) => (props.$bound ? 'var(--text-primary)' : 'white')};
    border-color: ${(props) => props.$color};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
`;

const BoundBadge = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
`;
