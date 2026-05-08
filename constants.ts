
export const STORAGE_KEY_DATA = 'landlord_data_v25';
export const STORAGE_KEY_CONFIG = 'landlord_config_v25';

export const DEFAULT_CONFIG = {
  defaultRent: '1000'
};

/* 
   🔴 修复邮件空白问题指南 (Fix Blank Emails) 
   
   Supabase 默认邮件模板可能是空白的。请将以下 HTML 复制到:
   Supabase Dashboard -> Authentication -> Email Templates
   
   1. Confirm Signup (注册验证邮件)
      Subject: 验证您的房租管家账号
      Body:
      <h2>欢迎注册房租管家</h2>
      <p>请点击下方链接完成邮箱验证：</p>
      <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563EB;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;font-weight:bold;">验证我的邮箱</a></p>
      <p style="font-size:12px;color:#666;">如果链接无法点击，请复制以下网址到浏览器打开：<br>{{ .ConfirmationURL }}</p>

   2. Reset Password (重置密码邮件)
      Subject: 重置您的房租管家密码
      Body:
      <h2>重置密码请求</h2>
      <p>您已申请重置密码。请点击下方链接设置新密码：</p>
      <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563EB;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;font-weight:bold;">前往重置密码</a></p>
      <p style="font-size:12px;color:#666;">如果链接无法点击，请复制以下网址到浏览器打开：<br>{{ .ConfirmationURL }}</p>
*/
