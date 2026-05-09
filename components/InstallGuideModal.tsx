import React from 'react';
import { Download, ExternalLink, Share, Smartphone, X } from 'lucide-react';
import { InstallPromptEvent } from '../types';

interface InstallGuideModalProps {
  installPrompt: InstallPromptEvent | null;
  onInstall: () => Promise<void>;
  onClose: () => void;
}

type Platform = 'wechat' | 'ios' | 'android' | 'desktop' | 'installed' | 'other';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent.toLowerCase();
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  if (standalone) return 'installed';
  if (/micromessenger/.test(ua)) return 'wechat';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';
  return 'other';
};

const getGuideSteps = (platform: Platform, canInstall: boolean) => {
  if (platform === 'installed') {
    return ['已经是桌面 App 模式，可以直接从手机桌面打开。'];
  }

  if (platform === 'wechat') {
    return ['点右上角 ...', '选择“在浏览器打开”', '打开后再点“安装应用”或“添加到主屏幕”'];
  }

  if (platform === 'ios') {
    return ['用 Safari 打开本网站', '点底部分享按钮', '选择“添加到主屏幕”', '点右上角“添加”'];
  }

  if (platform === 'android') {
    return canInstall
      ? ['点下面的“立即安装”', '浏览器弹窗里选择“安装”', '安装后从手机桌面打开']
      : ['用 Chrome 或 Edge 打开本网站', '点浏览器右上角菜单', '选择“安装应用”或“添加到主屏幕”'];
  }

  if (platform === 'desktop') {
    return canInstall
      ? ['点下面的“立即安装”', '浏览器弹窗里选择“安装”', '之后可以从桌面或开始菜单打开']
      : ['用 Chrome 或 Edge 打开本网站', '点地址栏右侧的安装图标', '或点浏览器菜单里的“安装应用”'];
  }

  return ['用 Chrome、Edge 或 Safari 打开本网站', '在浏览器菜单里选择“安装应用”或“添加到主屏幕”'];
};

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  installPrompt,
  onInstall,
  onClose,
}) => {
  const platform = detectPlatform();
  const canInstall = Boolean(installPrompt);
  const steps = getGuideSteps(platform, canInstall);
  const showInstallButton = canInstall && platform !== 'ios' && platform !== 'wechat' && platform !== 'installed';

  const title =
    platform === 'ios'
      ? '添加到 iPhone 桌面'
      : platform === 'wechat'
        ? '先用浏览器打开'
        : platform === 'installed'
          ? '已安装'
          : '安装到手机';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[200] animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              {platform === 'wechat' ? <ExternalLink size={22} /> : platform === 'ios' ? <Share size={22} /> : <Smartphone size={22} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">装好后像普通 App 一样从桌面打开</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 leading-6">{step}</p>
            </div>
          ))}
        </div>

        {showInstallButton ? (
          <button
            onClick={onInstall}
            className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 shadow-md flex items-center justify-center gap-2"
          >
            <Download size={18} />
            立即安装
          </button>
        ) : (
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-gray-700 bg-gray-100">
            我知道了
          </button>
        )}
      </div>
    </div>
  );
};
