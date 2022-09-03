java -jar "%~dp0MetroDownloader-0.0.2-SNAPSHOT.jar" "CHROME" "%~dp0drivers\chromedriver.exe" "%~dp0pdfs"
SET "error=%ERRORLEVEL%"
@ECHO OFF
IF %error% EQU 0 (
	ECHO "Download completed"
) ELSE IF %error% EQU 1 (
	ECHO "Unexpected error, check stacktrace"
) ELSE IF %error% EQU 2 (
	ECHO "Missing argument"
) ELSE IF %error% EQU 3 (
	ECHO "Download location doesn't exist"
) ELSE (
	ECHO "Undocumented error code: %error%"
)
PAUSE
