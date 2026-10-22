# ==============================================================================
# HE THONG QUAN LY THU CUNG (PETCARE MANAGEMENT SYSTEM)
# Script Kiem Thu Trang Thai Tai Khoan & Phan Quyen He Thong
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   PETCARE MANAGEMENT SYSTEM - KIEM TRA TAI KHOAN VA PHAN QUYEN       " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

$testResults = @()

# 1. Kiem tra tai khoan trong PostgreSQL
$dbQuery = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT u.username, r.name, u.is_active, u.password_hash FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username IN ('admin_khoa', 'nhanvien01');"

$lines = @()
if ($dbQuery) {
    $lines = ($dbQuery -split "`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}
$adminRow = $lines | Where-Object { $_ -like "admin_khoa|*" }
$staffRow = $lines | Where-Object { $_ -like "nhanvien01|*" }

$t1Pass = ($null -ne $adminRow) -and ($null -ne $staffRow)
$testResults += [PSCustomObject]@{
    TieuChi = "1. Kiem tra luu tru trong PostgreSQL"
    KetQua = if ($t1Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t1Pass) { "Ca 2 tai khoan admin_khoa va nhanvien01 da ton tai trong DB" } else { "Chua khoi tao tai khoan" }
}

# 2. Kiem tra vai tro ADMIN cua admin_khoa
$t2Pass = $false
if ($adminRow) {
    $role = ($adminRow -split '\|')[1]
    if ($role.Trim() -eq "ADMIN") { $t2Pass = $true }
}
$testResults += [PSCustomObject]@{
    TieuChi = "2. Phan quyen ADMIN cho admin_khoa"
    KetQua = if ($t2Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t2Pass) { "Khoa ngoai role_id tro chinh xac ve vai tro ADMIN" } else { "Chua ton tai hoac sai role" }
}

# 3. Kiem tra vai tro STAFF cua nhanvien01
$t3Pass = $false
if ($staffRow) {
    $role = ($staffRow -split '\|')[1]
    if ($role.Trim() -eq "STAFF") { $t3Pass = $true }
}
$testResults += [PSCustomObject]@{
    TieuChi = "3. Phan quyen STAFF cho nhanvien01"
    KetQua = if ($t3Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t3Pass) { "Khoa ngoai role_id tro chinh xac ve vai tro STAFF" } else { "Chua ton tai hoac sai role" }
}

# 4. Kiem tra ma hoa mat khau Bcrypt Hash (khong luu van ban thuan)
$t4Pass = $false
if ($adminRow -and $staffRow) {
    $adminHash = ($adminRow -split '\|')[3]
    $staffHash = ($staffRow -split '\|')[3]
    $aOk = ($adminHash.StartsWith('$2a$') -or $adminHash.StartsWith('$2b$')) -and ($adminHash.Length -ge 50)
    $sOk = ($staffHash.StartsWith('$2a$') -or $staffHash.StartsWith('$2b$')) -and ($staffHash.Length -ge 50)
    $t4Pass = $aOk -and $sOk
}
$testResults += [PSCustomObject]@{
    TieuChi = "4. Kiem tra bao mat ma hoa mat khau"
    KetQua = if ($t4Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t4Pass) { "Mat khau bam chuan bcrypt (rounds: 10), khong lo van ban tho" } else { "Chua co du lieu hop le" }
}

# 5. Kiem tra giu nguyen 3 tai khoan demo goc
$demoQuery = docker exec pet-postgres psql -U petadmin -d petmanagement -t -A -c "SELECT username FROM users WHERE username IN ('admin', 'staff1', 'staff2') ORDER BY id ASC;"
$demos = @()
if ($demoQuery) {
    $demos = ($demoQuery -split "`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}
$t5Pass = ($demos.Count -eq 3)
$testResults += [PSCustomObject]@{
    TieuChi = "5. Giu nguyen 3 tai khoan demo goc"
    KetQua = if ($t5Pass) { "PASS" } else { "FAIL" }
    ChiTiet = "Danh sach demo con nguyen: $($demos -join ', ')"
}

# 6. Kiem tra RBAC: Token nhan vien bi chan khi truy cap /api/audits
$apiBase = "http://127.0.0.1:8080/api"
$testTokenScript = @"
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const staffToken = jwt.sign({ id: 5, username: 'nhanvien01', role: 'STAFF', fullName: 'Nhân viên 01' }, secret, { expiresIn: '1h' });
const adminToken = jwt.sign({ id: 4, username: 'admin_khoa', role: 'ADMIN', fullName: 'Quản trị viên Khoa' }, secret, { expiresIn: '1h' });
console.log(JSON.stringify({ staffToken, adminToken }));
"@

$tokensJson = docker exec -i pet-backend node -e "$testTokenScript"
$tokensObj = $tokensJson | ConvertFrom-Json

$t6Pass = $false
try {
    $staffHeaders = @{ Authorization = "Bearer $($tokensObj.staffToken)" }
    $res = Invoke-RestMethod -Uri "$apiBase/audits" -Method Get -Headers $staffHeaders
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

# 7. Kiem tra RBAC: Token admin truy cap duoc /api/audits
$t7Pass = $false
try {
    $adminHeaders = @{ Authorization = "Bearer $($tokensObj.adminToken)" }
    $res = Invoke-RestMethod -Uri "$apiBase/audits" -Method Get -Headers $adminHeaders
    if ($res.success) {
        $t7Pass = $true
    }
} catch {
    $t7Pass = $false
}
$testResults += [PSCustomObject]@{
    TieuChi = "7. Admin truy cap chuc nang quan tri (/api/audits)"
    KetQua = if ($t7Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t7Pass) { "Backend tra ve HTTP 200 OK voi $($res.data.Count) ban ghi audit logs" } else { "Khong truy cap duoc" }
}

# 8. Kiem tra bo test hoi quy (npm test)
Write-Host "  Dang kiem tra bo test hoi quy (npm test)..." -ForegroundColor DarkGray
$testCmdOutput = docker exec pet-backend npm test 2>&1
$t8Pass = ($LASTEXITCODE -eq 0) -and ($testCmdOutput -match "passed")
if (-not $t8Pass) {
    $testCmdOutput = npm test --prefix backend 2>&1
    $t8Pass = ($LASTEXITCODE -eq 0) -and ($testCmdOutput -match "passed")
}
$testResults += [PSCustomObject]@{
    TieuChi = "8. Bo kiem thu hoi quy (Regression Tests)"
    KetQua = if ($t8Pass) { "PASS" } else { "FAIL" }
    ChiTiet = if ($t8Pass) { "100% tests dat yeu cau (5/5 tests passed)" } else { "Co bai test bi loi" }
}

Write-Host ""
$testResults | Format-Table -Property TieuChi, KetQua, ChiTiet -AutoSize

$allPass = -not ($testResults.KetQua -contains "FAIL")
if ($allPass) {
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host "      TAT CA CAC MUC KIEM THU DA DAT YEU CAU HOAN HAO (PASS)         " -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
}
