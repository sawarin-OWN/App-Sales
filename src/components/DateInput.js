import React, { useId } from 'react';

/**
 * ช่องเลือกวันที่: ใช้ input type="date" แบบแสดงจริงทั้งเว็บและมือถือ
 * เพื่อให้ native date picker / ปฏิทิน เปิดได้เมื่อคลิกทั้งบนเว็บและมือถือ
 * (เดิมบนเว็บใช้ overlay + input opacity-0 ทำให้บางเบราว์เซอร์ไม่เปิดปฏิทิน)
 * value/onChange ใช้รูปแบบ YYYY-MM-DD
 */
function DateInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  name,
  id: idProp,
  className = '',
  placeholder = 'dd/mm/yyyy',
  title = ''
}) {
  const fallbackId = useId();
  const inputId = idProp != null && idProp !== '' ? idProp : `date-input-${fallbackId.replace(/:/g, '')}`;
  const valueStr = value != null && value !== '' ? String(value).trim() : '';

  return (
    <div
      className={`rounded-lg border-2 border-gray-300 bg-white min-h-[48px] overflow-hidden flex items-center ${disabled ? 'opacity-60' : ''} ${className}`}
      style={{ minHeight: 48 }}
    >
      <input
        type="date"
        id={inputId}
        value={valueStr || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        name={name}
        disabled={disabled}
        title={title || placeholder}
        aria-label={placeholder}
        className="w-full min-h-[48px] border-0 bg-transparent px-3 py-2 text-gray-900 cursor-pointer focus:outline-none focus:ring-0 [color-scheme:light]"
        style={{ fontSize: 16 }}
      />
    </div>
  );
}

export default DateInput;
