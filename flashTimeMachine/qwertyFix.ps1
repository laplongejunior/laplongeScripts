$flag=Test-Path $PSScriptRoot"\qwertyFix.txt"
#$flag=1

$lang = Get-WinUserLanguageList
#$lang="fr-BE"

if ($flag) {
	$temp = Get-WinUserLanguageList
	$temp.Insert(0, "en-US")
	Set-WinUserLanguageList -LanguageList $temp -Force
}
Start-Process $PSScriptRoot"\game-hardlink.exe" -Wait
if ($flag) {
	Set-WinUserLanguageList -LanguageList $lang -Force
}
