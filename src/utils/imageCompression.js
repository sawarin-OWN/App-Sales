/**
 * Utility function for image compression
 * ใช้สำหรับบีบอัดรูปภาพให้เหมาะสมสำหรับการส่งไปยัง GAS
 */

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    // ตรวจสอบประเภทไฟล์
    if (!file.type.match('image.*')) {
      reject(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น'));
      return;
    }
    
    // ตรวจสอบขนาดไฟล์ (5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB'));
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        // จำกัดขนาดสูงสุด 400px และคุณภาพต่ำมาก (เพื่อลดขนาดไฟล์ให้เล็กที่สุด)
        const maxWidth = 400;
        const maxHeight = 400;
        let quality = 0.3; // เริ่มด้วยคุณภาพต่ำมาก
        
        // คำนวณขนาดที่เหมาะสม (ไม่เกิน 400px)
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (img.width > maxWidth || img.height > maxHeight) {
          if (img.width > img.height) {
            targetHeight = (img.height * maxWidth) / img.width;
            targetWidth = maxWidth;
          } else {
            targetWidth = (img.width * maxHeight) / img.height;
            targetHeight = maxHeight;
          }
        }
        
        // บีบอัดหลายครั้งจนได้ขนาดที่เหมาะสม (< 30KB binary = ~40KB base64)
        let compressedBase64 = '';
        let compressedSizeKB = Infinity;
        let currentQuality = quality;
        let currentWidth = Math.floor(targetWidth);
        let currentHeight = Math.floor(targetHeight);
        const maxAttempts = 10;
        let attempts = 0;
        
        while (compressedSizeKB > 30 && attempts < maxAttempts && currentQuality >= 0.2) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = currentWidth;
          tempCanvas.height = currentHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          // ตั้งค่าคุณภาพการวาดรูป
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'low';
          tempCtx.drawImage(img, 0, 0, currentWidth, currentHeight);
          
          compressedBase64 = tempCanvas.toDataURL('image/jpeg', currentQuality).split(',')[1];
          compressedSizeKB = (compressedBase64.length * 3) / 4 / 1024;
          
          if (compressedSizeKB > 30) {
            if (currentWidth > 300 && currentHeight > 300) {
              // ลดขนาดก่อน (ลดลง 20%)
              currentWidth = Math.floor(currentWidth * 0.8);
              currentHeight = Math.floor(currentHeight * 0.8);
            } else if (currentWidth > 200 && currentHeight > 200) {
              // ลดขนาดต่อ (ลดลง 30%)
              currentWidth = Math.floor(currentWidth * 0.7);
              currentHeight = Math.floor(currentHeight * 0.7);
            } else {
              // ลดคุณภาพ
              currentQuality -= 0.05;
            }
          }
          attempts++;
        }
        
        // ถ้ายังใหญ่เกิน 30KB ให้ลดขนาดสุดท้ายเป็น 300x300 หรือ 200x200
        if (compressedSizeKB > 30) {
          const finalSize = compressedSizeKB > 50 ? 200 : 300;
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = finalSize;
          finalCanvas.height = finalSize;
          const finalCtx = finalCanvas.getContext('2d');
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'low';
          finalCtx.drawImage(img, 0, 0, finalSize, finalSize);
          compressedBase64 = finalCanvas.toDataURL('image/jpeg', 0.2).split(',')[1];
          compressedSizeKB = (compressedBase64.length * 3) / 4 / 1024;
        }
        
        resolve({
          base64: compressedBase64,
          sizeKB: compressedSizeKB,
          fileName: file.name
        });
      };
      
      img.onerror = () => {
        reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
      };
      
      img.src = reader.result;
    };
    
    reader.onerror = () => {
      reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    };
    
    reader.readAsDataURL(file);
  });
}

