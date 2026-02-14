# สคริปต์เปลี่ยน remote ไปที่ repo ของ saocafe31-pixel แล้ว push
# ใช้เมื่อสร้าง repo ใหม่ที่ https://github.com/saocafe31-pixel/App-Shop (หรือเปลี่ยนชื่อ repo ด้านล่าง)

$repoName = "App-Shop"   # ถ้าสร้าง repo ชื่ออื่น ให้แก้ตรงนี้
$remoteUrl = "https://github.com/saocafe31-pixel/$repoName.git"

Write-Host "เปลี่ยน origin เป็น: $remoteUrl" -ForegroundColor Cyan
git remote set-url origin $remoteUrl
git remote -v
Write-Host ""
Write-Host "กำลัง push ไป origin main ..." -ForegroundColor Cyan
git push -u origin main
