
import React, { useState } from 'react';
import { X, Cloud, LogIn, UserPlus, AlertCircle, Lock, Mail, KeyRound, LogOut, Trash2 } from 'lucide-react';

interface CloudAuthModalProps {
  initialMode?: 'login' | 'signup' | 'update';
  onLogin: (email: string, pass: string, isSignup: boolean) => Promise<string | void>;
  onUpdatePassword: (pass: string) => Promise<string | void>;
  onLogout: () => void;
  currentUser: any;
  onClose: () => void;
}

export const CloudAuthModal: React.FC<CloudAuthModalProps> = ({ 
  initialMode = 'login', onLogin, onUpdatePassword, onLogout, currentUser, onClose 
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'update'>(initialMode as any);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'err' | 'success', text: string } | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const clearMsg = () => setMsg(null);

  const handleSubmit = async () => {
    clearMsg();
    
    // --- MODE 1: Normal Update (Logged In) ---
    if (mode === 'update') {
        if (!password) return setMsg({ type: 'err', text: '请输入新密码' });
        if (password !== confirmPass) return setMsg({ type: 'err', text: '两次密码输入不一致' });
        if (password.length < 6) return setMsg({ type: 'err', text: '密码长度至少6位' });

        setLoading(true);
        try {
            const err = await onUpdatePassword(password);
            if (err) setMsg({ type: 'err', text: err });
            else {
                setMsg({ type: 'success', text: '密码修改成功，请重新登录' });
                setTimeout(() => { onClose(); setMode('login'); }, 1500);
            }
        } catch(e: any) { setMsg({ type: 'err', text: e.message }); }
        setLoading(false);
        return;
    }

    if (!email) return setMsg({ type: 'err', text: '请填写邮箱' });
    if (!password) return setMsg({ type: 'err', text: '请填写密码' });
    
    // --- MODE 2: Login / Signup ---
    if (mode === 'signup') {
        if (password !== confirmPass) return setMsg({ type: 'err', text: '两次密码输入不一致' });
        if (password.length < 6) return setMsg({ type: 'err', text: '密码长度至少6位' });
    }
    
    setLoading(true);
    try {
      const isSignup = mode === 'signup';
      const res = await onLogin(email, password, isSignup);
      
      if (res) {
        setMsg({ type: 'err', text: typeof res === 'string' ? res : '操作失败' });
      } else {
        setMsg({ type: 'success', text: isSignup ? '注册成功，已登录' : '登录成功' });
        onClose();
      }
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error' });
    }
    setLoading(false);
  };

  const switchMode = (m: any) => {
      setMode(m);
      clearMsg();
      setPassword('');
      setConfirmPass('');
  };

  const getTitle = () => {
      if (mode === 'update') return '重置密码';
      if (currentUser) return '账号中心';
      if (mode === 'signup') return '注册账号';
      return '登录';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
      <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Cloud className="text-blue-600"/> 
            {getTitle()}
          </h3>
          <button onClick={onClose}><X className="text-gray-400"/></button>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-xs font-bold flex items-start gap-2 ${msg.type === 'err' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0"/> <span className="break-all">{msg.text}</span>
          </div>
        )}

        {currentUser && mode !== 'update' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud size={32}/>
              </div>
              <p className="font-bold text-lg text-gray-800">已登录</p>
              <p className="text-sm text-gray-500 mb-6">{currentUser.email}</p>
              <p className="text-xs text-blue-500 bg-blue-50 p-2 rounded mb-6">您的数据正在自动同步到云端</p>
              
              {!logoutConfirm ? (
                <button 
                  onClick={() => setLogoutConfirm(true)} 
                  className="w-full py-3 border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <LogOut size={16}/> 退出登录
                </button>
              ) : (
                <div className="bg-red-50 p-3 rounded-xl animate-in fade-in">
                  <p className="text-xs text-red-600 font-bold mb-3">确定退出？本地缓存的数据将被清除。</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLogoutConfirm(false)} 
                      className="flex-1 py-2 bg-white text-gray-600 rounded border border-gray-200 text-xs font-bold"
                    >
                      取消
                    </button>
                    <button 
                      onClick={onLogout} 
                      className="flex-1 py-2 bg-red-600 text-white rounded text-xs font-bold shadow-md hover:bg-red-700 flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12}/> 确认退出
                    </button>
                  </div>
                </div>
              )}
            </div>
        ) : (
          <div className="space-y-4">
            
            {mode !== 'update' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">邮箱</label>
                  <div className="relative">
                      <Mail size={16} className="absolute left-0 top-3 text-gray-400"/>
                      <input 
                          type="email" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          className="w-full border-b py-2 pl-6 text-base font-bold outline-none focus:border-blue-500 transition-colors" 
                          placeholder="email@example.com"
                      />
                  </div>
                </div>
            )}

            {/* PASSWORD INPUTS */}
            <div className="animate-in slide-in-from-bottom-2">
              <label className="text-xs font-bold text-gray-400 mb-1 block">
                  {mode === 'update' ? '新密码' : '密码'}
              </label>
              <div className="relative">
                  <Lock size={16} className="absolute left-0 top-3 text-gray-400"/>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full border-b py-2 pl-6 text-base font-bold outline-none focus:border-blue-500 transition-colors" 
                    placeholder=""
                  />
              </div>
            </div>

            {(mode === 'signup' || mode === 'update') && (
                <div className="animate-in slide-in-from-bottom-2">
                  <label className="text-xs font-bold text-gray-400 mb-1 block">确认新密码</label>
                  <div className="relative">
                      <Lock size={16} className="absolute left-0 top-3 text-gray-400"/>
                      <input 
                        type="password" 
                        value={confirmPass} 
                        onChange={e => setConfirmPass(e.target.value)} 
                        className="w-full border-b py-2 pl-6 text-base font-bold outline-none focus:border-blue-500 transition-colors" 
                        placeholder="再次输入密码"
                      />
                  </div>
                </div>
            )}
            
            <div className="pt-2 flex flex-col gap-2">
                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="w-full py-3 bg-black text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                >
                    {loading ? '处理中...' : (
                        mode === 'login' ? <><LogIn size={16}/> 登录</> : 
                        (mode === 'signup' ? <><UserPlus size={16}/> 注册</> : 
                        <><KeyRound size={16}/> 修改密码</>)
                    )}
                </button>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-gray-500 pt-2">
                {mode === 'login' && (
                    <div className="w-full text-center">
                        <span className="text-gray-400 font-normal">没有账号? </span>
                        <button onClick={() => switchMode('signup')} className="text-blue-600 hover:text-blue-700">注册新账号</button>
                    </div>
                )}
                {mode === 'signup' && (
                    <div className="w-full text-center">
                        <span className="text-gray-400 font-normal">已有账号? </span>
                        <button onClick={() => switchMode('login')} className="text-blue-600 hover:text-blue-700">立即登录</button>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
