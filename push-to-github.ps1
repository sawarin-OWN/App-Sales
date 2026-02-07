# Push โปรเจกต์ไปที่ https://github.com/saocafe31-pixel/sales-report.git
# ใช้ได้หลังจากติดตั้ง Git แล้ว (หรือรันจาก Git Bash)
# วิธีใช้: คลิกขวาไฟล์นี้ -> Run with PowerShell หรือใน PowerShell: .\push-to-github.ps1

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/saocafe31-pixel/sales-report.git"
$projectDir = $PSScriptRoot

Set-Location $projectDir

# ตรวจว่ามี git หรือยัง
try {
    $null = git --version
} catch {
    Write-Host "ไม่พบคำสั่ง git กรุณาติดตั้ง Git for Windows จาก https://git-scm.com/download/win หรือใช้ GitHub Desktop ตามไฟล์ แก้-git-ไม่รู้คำสั่ง.md" -ForegroundColor Red
    exit 1
}

# ถ้ามี .git อยู่แล้ว
if (Test-Path ".git") {
    Write-Host "โฟลเดอร์เป็น Git repo อยู่แล้ว..."
    git remote remove origin 2>$null
    git remote add origin $repoUrl
    # ถ้ายังไม่มี commit หรือมีไฟล์ยังไม่ commit ให้ add และ commit ก่อน
    $prevErr = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $hasCommit = (git rev-parse HEAD 2>$null); $ErrorActionPreference = $prevErr
    $status = git status --porcelain 2>$null
    if (-not $hasCommit -or $status) {
        Write-Host "กำลัง add และ commit ไฟล์..."
        git add .
        git commit -m "Initial commit - Sales Report React app"
        if ($LASTEXITCODE -ne 0) { git commit --allow-empty -m "Initial commit - Sales Report React app" }
    }
    git branch -M main
    git push -u origin main
    Write-Host "Push เสร็จแล้ว: $repoUrl" -ForegroundColor Green
    exit 0
}

Write-Host "กำลัง init repo, add, commit และ push..."
git init
git add .
git commit -m "Initial commit - Sales Report React app"
git branch -M main
git remote add origin $repoUrl
git push -u origin main

Write-Host "Push เสร็จแล้ว: $repoUrl" -ForegroundColor Green
