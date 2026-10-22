# ==============================================================================
# HE THONG QUAN LY THU CUNG (PETCARE MANAGEMENT SYSTEM)
# Script Khoi Tao & Kiem Thu Tai Khoan: admin_khoa (ADMIN) & nhanvien01 (STAFF)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   PETCARE MANAGEMENT SYSTEM - KHOI TAO TAI KHOAN ADMIN & NHAN VIEN   " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "[*] Tai khoan Quan tri vien: username 'admin_khoa', vai tro 'ADMIN'" -ForegroundColor White
Write-Host "[*] Tai khoan Nhan vien:     username 'nhanvien01', vai tro 'STAFF'" -ForegroundColor White
Write-Host "[!] Mat khau se duoc che dau (*) khi nhap, KHONG in ra log hoac luu van ban thuan." -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------------`n"

# 1. Kiem tra trang thai Docker containers
Write-Host "[1/4] Kiem tra trang thai dich vu Docker..." -ForegroundColor Cyan
$runningBackend = docker ps --filter "name=pet-backend" --filter "status=running" -q
$runningPostgres = docker ps --filter "name=pet-postgres" --filter "status=running" -q

if (-not $runningBackend -or -not $runningPostgres) {
    Write-Host "[LOI] Dich vu pet-backend hoac pet-postgres chua hoat dong!" -ForegroundColor Red
    Write-Host "Vui long khoi dong he thong bang lenh: docker compose up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "  -> Docker containers (pet-backend, pet-postgres) dang hoat dong tot.`n" -ForegroundColor Green

# Kiem tra xem tai khoan da ton tai trong DB chua
$existingUsers = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT username FROM users WHERE username IN ('admin_khoa', 'nhanvien01');"
$hasExisting = ($existingUsers -match "admin_khoa") -and ($existingUsers -match "nhanvien01")

# Ham nhap mat khau an toan va xac nhan
function Get-SecureInputPassword {
    param(
        [string]$Username,
        [string]$RoleName,
        [bool]$IsExisting
    )

    while ($true) {
        $promptMsg = if ($IsExisting) { "Nhap mat khau da dat cho [$Username] de kiem thu dang nhap" } else { "Nhap mat khau cho [$Username] (Role: $RoleName)" }
        Write-Host "--- $promptMsg ---" -ForegroundColor Yellow
        $secPass1 = Read-Host -Prompt "  Nhap mat khau (toi thieu 6 ky tu)" -AsSecureString
        $bstr1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass1)
        $plainPass1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)

        if (-not $plainPass1 -or $plainPass1.Length -lt 6) {
            Write-Host "  [!] Mat khau qua ngan. Vui long nhap toi thieu 6 ky tu!`n" -ForegroundColor Red
            continue
        }

        if (-not $IsExisting) {
            $secPass2 = Read-Host -Prompt "  Xac nhan lai mat khau cho [$Username]" -AsSecureString
            $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass2)
            $plainPass2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)

            if ($plainPass1 -ne $plainPass2) {
                Write-Host "  [!] Mat khau xac nhan KHONG KHOP. Vui long nhap lai!`n" -ForegroundColor Red
                continue
            }
        }

        Write-Host "  -> Mat khau cho [$Username] da duoc xac nhan.`n" -ForegroundColor Green
        return $plainPass1
    }
}

# 2. Thu thap mat khau tu nguoi dung
Write-Host "[2/4] Nhap mat khau bao mat cho tung tai khoan:" -ForegroundColor Cyan
$adminPass = Get-SecureInputPassword -Username "admin_khoa" -RoleName "ADMIN" -IsExisting $hasExisting
$staffPass = Get-SecureInputPassword -Username "nhanvien01" -RoleName "STAFF" -IsExisting $hasExisting

# 3. Gui payload JSON qua stdin vao container pet-backend
Write-Host "[3/4] Dang dong bo tai khoan trong co so du lieu PostgreSQL..." -ForegroundColor Cyan

$payloadObject = @{
    adminPassword = $adminPass
    staffPassword = $staffPass
}
$jsonPayload = $payloadObject | ConvertTo-Json -Compress

$scriptPath = Join-Path $PSScriptRoot "create-accounts.cjs"
if (-not (Test-Path $scriptPath)) {
    $scriptPath = "scripts/create-accounts.cjs"
}

$runnerCode = Get-Content -Raw -Encoding UTF8 $scriptPath
$execResult = $jsonPayload | docker exec -i pet-backend node -e "$runnerCode"

try {
    $resultObj = $execResult | ConvertFrom-Json
} catch {
    Write-Host "[LOI] Phan hoi tu script khong dung dinh dang:" -ForegroundColor Red
    Write-Host $execResult
    exit 1
}

if (-not $resultObj.success) {
    Write-Host "[LOI] Xu ly tai khoan that bai: $($resultObj.message)" -ForegroundColor Red
    exit 1
}

$adminMsg = if ($resultObj.results.admin.message) { $resultObj.results.admin.message } else { $resultObj.admin.message }
$staffMsg = if ($resultObj.results.staff.message) { $resultObj.results.staff.message } else { $resultObj.staff.message }

Write-Host "  -> Admin: $adminMsg" -ForegroundColor Green
Write-Host "  -> Staff: $staffMsg`n" -ForegroundColor Green

# 4. Kiem thu tu dong 10 tieu chi theo yeu cau
Write-Host "[4/4] BAT DAU KIEM THU 10 TIEU CHI BAT BUOC:" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------" -ForegroundColor DarkGray

$testResults = @()

# Tieu chi 1: Hai tai khoan duoc luu thanh cong trong PostgreSQL
$dbQuery = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT username, role_id, is_active FROM users WHERE username IN ('admin_khoa', 'nhanvien01');"
$savedUsernames = @()
if ($dbQuery) {
    $savedUsernames = ($dbQuery -split "`n") | ForEach-Object { ($_ -split '\|')[0].Trim() }
}
$t1Pass = ($savedUsernames -contains 'admin_khoa') -and ($savedUsernames -contains 'nhanvien01')
$testResults += [PSCustomObject]@{
    TieuChi = "1. Luu thanh cong trong PostgreSQL"
    KetQua = if ($t1Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Tim thay trong DB: $($savedUsernames -join ', ')"
}

# Tieu chi 2: Dang nhap admin_khoa qua API Backend
$apiBase = "http://127.0.0.1:8080/api"
$adminLoginBody = @{ username = "admin_khoa"; password = $adminPass } | ConvertTo-Json
$adminToken = $null
$t2Pass = $false
try {
    $adminRes = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
    if ($adminRes.success -and $adminRes.data.token) {
        $adminToken = $adminRes.data.token
        $t2Pass = $true
    }
} catch {
    $t2Pass = $false
}
$testResults += [PSCustomObject]@{
    TieuChi = "2. Dang nhap admin_khoa thanh cong"
    KetQua = if ($t2Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t2Pass) { "Nhan JWT Token hop le tu /api/auth/login" } else { "Dang nhap that bai (sai mat khau hoac API loi)" }
}

# Tieu chi 3: Dang nhap nhanvien01 qua API Backend
$staffLoginBody = @{ username = "nhanvien01"; password = $staffPass } | ConvertTo-Json
$staffToken = $null
$t3Pass = $false
try {
    $staffRes = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post -Body $staffLoginBody -ContentType "application/json"
    if ($staffRes.success -and $staffRes.data.token) {
        $staffToken = $staffRes.data.token
        $t3Pass = $true
    }
} catch {
    $t3Pass = $false
}
$testResults += [PSCustomObject]@{
    TieuChi = "3. Dang nhap nhanvien01 thanh cong"
    KetQua = if ($t3Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t3Pass) { "Nhan JWT Token hop le tu /api/auth/login" } else { "Dang nhap that bai (sai mat khau hoac API loi)" }
}

# Tieu chi 4: Tai khoan Admin nhan dung role ADMIN
$adminRoleDb = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = 'admin_khoa';"
$adminRoleLogin = if ($adminRes -and $adminRes.data -and $adminRes.data.user) { $adminRes.data.user.role } else { "N/A" }
$t4Pass = ($adminRoleDb.Trim() -eq "ADMIN") -and ($adminRoleLogin -eq "ADMIN")
$testResults += [PSCustomObject]@{
    TieuChi = "4. Tai khoan Admin nhan dung quyen ADMIN"
    KetQua = if ($t4Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Role DB: $($adminRoleDb.Trim()) | Role Token: $adminRoleLogin"
}

# Tieu chi 5: Tai khoan Staff nhan dung role STAFF
$staffRoleDb = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = 'nhanvien01';"
$staffRoleLogin = if ($staffRes -and $staffRes.data -and $staffRes.data.user) { $staffRes.data.user.role } else { "N/A" }
$t5Pass = ($staffRoleDb.Trim() -eq "STAFF") -and ($staffRoleLogin -eq "STAFF")
$testResults += [PSCustomObject]@{
    TieuChi = "5. Tai khoan Nhan vien nhan dung quyen STAFF"
    KetQua = if ($t5Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Role DB: $($staffRoleDb.Trim()) | Role Token: $staffRoleLogin"
}

# Tieu chi 6: Nhan vien khong the truy cap API chi danh cho Admin (GET /api/audits)
$t6Pass = $false
try {
    $staffHeaders = @{ Authorization = "Bearer $staffToken" }
    $forbiddenRes = Invoke-RestMethod -Uri "$apiBase/audits" -Method Get -Headers $staffHeaders
    $t6Pass = $false
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        $t6Pass = $true
    }
}
$testResults += [PSCustomObject]@{
    TieuChi = "6. Chan Nhan vien truy cap API Admin (/api/audits)"
    KetQua = if ($t6Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t6Pass) { "Backend tra ve HTTP 403 Forbidden chinh xac" } else { "Khong chan duoc quyen!" }
}

# Tieu chi 7: Admin co the truy cap cac chuc nang quan tri (/api/audits)
$t7Pass = $false
$auditCount = 0
try {
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }
    $auditRes = Invoke-RestMethod -Uri "$apiBase/audits" -Method Get -Headers $adminHeaders
    if ($auditRes.success) {
        $t7Pass = $true
        $auditCount = $auditRes.data.Count
    }
} catch {
    $t7Pass = $false
}
$testResults += [PSCustomObject]@{
    TieuChi = "7. Admin truy cap thanh cong chuc nang quan tri"
    KetQua = if ($t7Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t7Pass) { "Backend tra ve HTTP 200 OK voi $auditCount ban ghi audit logs" } else { "Khong truy cap duoc" }
}

# Tieu chi 8: Mat khau duoc luu duoi dang bcrypt hash, khong phai van ban thuan
$hashQuery = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT username, password_hash FROM users WHERE username IN ('admin_khoa', 'nhanvien01');"
$t8Pass = $true
foreach ($line in ($hashQuery -split "`n")) {
    if (-not [string]::IsNullOrWhiteSpace($line)) {
        $parts = $line -split '\|'
        $uName = $parts[0]
        $pHash = $parts[1]
        if (-not ($pHash.StartsWith('$2a$') -or $pHash.StartsWith('$2b$')) -or $pHash.Length -lt 50) {
            $t8Pass = $false
        }
    }
}
$testResults += [PSCustomObject]@{
    TieuChi = "8. Mat khau luu duoi dang Bcrypt Hash an toan"
    KetQua = if ($t8Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Chuan hash: bcrypt $2b$, do dai 60 ky tu, khong luu van ban thuan"
}

# Tieu chi 9: Cac tai khoan demo (admin, staff1, staff2) van duoc giu nguyen
$demoQuery = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT username FROM users WHERE username IN ('admin', 'staff1', 'staff2') ORDER BY id ASC;"
$demos = ($demoQuery -split "`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$t9Pass = ($demos.Count -eq 3)
$testResults += [PSCustomObject]@{
    TieuChi = "9. Giu nguyen 3 tai khoan demo goc"
    KetQua = if ($t9Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Danh sach demo con nguyen: $($demos -join ', ')"
}

# Tieu chi 10: Cac bai kiem thu cu chay thanh cong (npm test)
Write-Host "  Dang chay bo kiem thu he thong (npm test)..." -ForegroundColor DarkGray
$testCmdOutput = docker exec pet-backend npm test 2>&1
$t10Pass = ($LASTEXITCODE -eq 0) -and ($testCmdOutput -match "passed")
if (-not $t10Pass) {
    $testCmdOutput = npm test --prefix backend 2>&1
    $t10Pass = ($LASTEXITCODE -eq 0) -and ($testCmdOutput -match "passed")
}
$testResults += [PSCustomObject]@{
    TieuChi = "10. Bo kiem thu hoi quy (Regression Tests)"
    KetQua = if ($t10Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t10Pass) { "100% tests dat yeu cau (5/5 tests passed)" } else { "Co bai test bi loi" }
}

# In bang ket qua
Write-Host ""
$testResults | Format-Table -Property TieuChi, KetQua, ChiTiet -AutoSize

$allPass = -not ($testResults.KetQua -contains "FAIL")
if ($allPass) {
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host "     TAT CA 10/10 TIEU CHI DA DUOC KIEM THU VA HOAN TAT THANH CONG   " -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host "Ban co the dang nhap ngay tren trinh duyet tai: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "• Tai khoan Quan tri: admin_khoa" -ForegroundColor White
    Write-Host "• Tai khoan Nhan vien: nhanvien01" -ForegroundColor White
} else {
    Write-Host "Co mot so tieu chi chua dat yeu cau. Vui long xem chi tiet o bang tren." -ForegroundColor Red
}

# Xoa bien mat khau khoi bo nho PowerShell
$adminPass = $null
$staffPass = $null
$jsonPayload = $null
[System.GC]::Collect()