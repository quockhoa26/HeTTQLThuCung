import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface DemoQRCodeProps {
  data: string;
  size?: number;
  invoiceCode?: string;
  amount?: number;
  showDisclaimer?: boolean;
}

export const DemoQRCode: React.FC<DemoQRCodeProps> = ({
  data,
  size = 180,
  invoiceCode,
  amount,
  showDisclaimer = true,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Không thể tạo mã QR');
      });

    return () => {
      isMounted = false;
    };
  }, [data, size]);

  const formatPrice = (val?: number) => {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#f8fafc',
        border: '2px dashed #94a3b8',
        borderRadius: '12px',
        padding: '16px',
        maxWidth: '360px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#fef3c7',
          color: '#92400e',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          marginBottom: '10px',
          border: '1px solid #fde68a',
        }}
      >
        <span>📱 QR DEMO MINH HỌA</span>
      </div>

      <div
        style={{
          background: '#ffffff',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: '12px',
        }}
      >
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Mã QR Demo Minh Họa"
            style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
          />
        ) : error ? (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', padding: '20px' }}>{error}</div>
        ) : (
          <div style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            Đang tạo mã QR...
          </div>
        )}
      </div>

      <div style={{ width: '100%', fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
        {invoiceCode && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Mã hóa đơn:</span>
            <code style={{ fontWeight: 700, color: '#2563eb' }}>{invoiceCode}</code>
          </div>
        )}
        {amount !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Số tiền cần thanh toán:</span>
            <span style={{ fontWeight: 800, color: '#dc2626' }}>{formatPrice(amount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#64748b' }}>Nội dung:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>THANH TOAN DEMO</span>
        </div>
      </div>

      {showDisclaimer && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '0.72rem',
            color: '#b45309',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          <strong>⚠️ Dữ liệu minh họa:</strong> Đây là mã QR giả lập tạo từ chuỗi demo phục vụ kiểm thử và thuyết trình, không phải thông tin chuyển khoản ngân hàng thật.
        </div>
      )}
    </div>
  );
};
