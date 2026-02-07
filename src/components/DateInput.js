import React, { useRef } from 'react';
import { formatDateForDisplay } from '../utils/dateUtils';

/**
 * ช่องเลือกวันที่: แสดงเป็น dd/mm/yyyy + ปุ่มปฏิทิน
 * คลิกที่ช่องหรือไอคอนแล้วเปิดตารางปฏิทินให้เลือกวันที่
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
  id,
  className = '',
  placeholder = 'dd/mm/yyyy',
  title = ''
}) {
  const inputRef = useRef(null);
  const valueStr = value != null && value !== '' ? String(value).trim() : '';
  const displayText = valueStr ? formatDateForDisplay(valueStr) : '';

  const openPicker = (e) => {
    if (disabled) return;
    e.preventDefault();
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(e); } }}
      className={`relative flex items-center border-2 border-gray-300 rounded-lg bg-white min-h-[48px] cursor-pointer ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      {/* ชั้น 1: แสดงวันที่ */}
      <span className="pointer-events-none absolute inset-0 z-0 flex items-center px-3 pr-12 text-left text-gray-900">
        {displayText ? displayText : <span className="text-gray-400">{placeholder}</span>}
      </span>
      {/* ชั้น 2: input ปฏิทิน — ซ่อนไว้ เปิดผ่าน ref เมื่อคลิกที่ช่อง */}
      <input
        ref={inputRef}
        type="date"
        value={valueStr || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        name={name}
        id={id}
        disabled={disabled}
        title={title}
        aria-label={placeholder}
        className="absolute inset-0 z-[5] w-full h-full min-w-0 border-0 bg-transparent p-0 opacity-0 pointer-events-none"
        style={{ fontSize: 16 }}
      />
      {/* ชั้น 3: โซนไอคอน — pointer-events-none ให้คลิกทะลุไป input, cursor-pointer */}
      <span
        className="pointer-events-none absolute right-0 top-0 z-[10] flex h-full w-12 cursor-pointer items-center justify-center text-gray-500"
        aria-hidden
      >
        <i className="fas fa-calendar-alt" />
      </span>
    </div>
  );
}

export default DateInput;
