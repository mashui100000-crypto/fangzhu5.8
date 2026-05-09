import React from 'react';
import { Copy, MessageCircle, X } from 'lucide-react';

interface ContactAuthorModalProps {
  onClose: () => void;
}

const WECHAT_ID = 'pitayaaaaaaaaaaaaaaa';

export const ContactAuthorModal: React.FC<ContactAuthorModalProps> = ({ onClose }) => {
  const copyWechat = () => {
    navigator.clipboard
      .writeText(WECHAT_ID)
      .then(() => alert('微信号已复制'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[200] animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">作者联系方式</h3>
              <p className="text-xs text-gray-500 mt-0.5">问题反馈、定制功能都可以联系</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 text-center">
          <p className="text-xs font-bold text-gray-400 mb-1">微信</p>
          <p className="text-lg font-black text-gray-900 tracking-wide break-all">{WECHAT_ID}</p>
        </div>

        <button
          onClick={copyWechat}
          className="w-full py-3 rounded-xl font-bold text-white bg-green-600 shadow-md flex items-center justify-center gap-2"
        >
          <Copy size={18} />
          复制微信号
        </button>
      </div>
    </div>
  );
};
