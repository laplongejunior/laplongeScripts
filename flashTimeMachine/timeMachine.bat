@ECHO OFF
REM Create a desktop shortcut and check properties
REM That way you'll know what steam launchid has been assigned to the powershell script
REM Alternatively, you can use the id from the screenshots folder
REM Leave blank to not attempt to start the game
REM In this case, the script will simply exit after setting up the hardlink

SET "STEAMID=10949883902730174464"
REM Old versions from the flash era can be hardcoded for Qwerty controls
REM Along side those exes, we will create a small .txt file as a flag
REM If the file is linked along the exe, then the powershell start script will change the locale
REM While the computer run as en_US, the control scheme will use the dev-intended layout
SET "KEYBOARD=qwertyFix.txt"

REM Actual script starts here
SET "OriginDir=%~dp0"
SET "Link=%OriginDir%game-hardlink.exe"
SET "Flag=%OriginDir%%KEYBOARD%"
IF EXIST "%Link%" ( DEL "%Link%" )
IF EXIST "%Flag%" ( DEL "%Flag%" )

FOR %%f IN ("%OriginDir:~0,-1%") DO SET "CurrentDir=%%~dpfversions\"
ECHO Folders contained in game folder ( %CurrentDir% )
FOR /d %%f IN ("%CurrentDir%*") DO ECHO %%~nxf

SET /p Version="Enter version folder: "
SET "CurrentDir=%CurrentDir%%Version%\"
SET "KEYBOARD=%CurrentDir%%KEYBOARD%"

FOR %%f IN ("%CurrentDir%*.exe") DO SET "Target=%%f"
SET "Check=%CurrentDir%qwertyFix.txt"
IF NOT DEFINED Target (
	ECHO "Error: no exe in folder"
	EXIT 1
) 
MKLINK /H "%Link%" "%Target%"
IF EXIST "%KEYBOARD%" (MKLINK /H "%Flag%" "%KEYBOARD%")
IF DEFINED STEAMID ( START "" "steam://rungameid/%STEAMID%" )
