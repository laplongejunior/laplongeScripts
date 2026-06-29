#include <AutoItConstants.au3>
;global $MOUSE_CLICK_LEFT = "left"
;global $OPT_MATCHEXACT = 3
AutoItSetOption("WinTitleMatchMode",$OPT_MATCHEXACT)
global $PRECISION = 1000 ; Pos arguments are in 1/1000 of window size
global $FIXEDRATIO = 0 ; Inscryption isn't letterboxed

; We aim for 666
global $MAXLOOP = 650

global $WINTITLE = "Inscryption"
global $STEAMID = "1092790"
global $winHandle = SteamCheck($WINTITLE&".exe", $WINTITLE, $STEAMID, 10000)

;global $WINTITLE = "Inscryption"
;global $STEAMID = "1092790"
;global $winHandle = SteamCheck("Inscryption.exe", $WINTITLE, $STEAMID, 10000)

global $running = false
$ENTER = "{Enter}"
$TAB = "{Tab}"

While WinWait($WINTITLE, "", 1)
	If WinActive($WINTITLE) = $winHandle Then
		HotKeySet($ENTER, "SwitchFlag")
		HotKeySet($TAB, "ShowCoords")
	Else
		HotKeySet($ENTER)
		HotKeySet($TAB)
	EndIf
	
	Sleep(1000)
WEnd

HotKeySet($ENTER)
HotKeySet($TAB)
Exit(0)

Func ShowCoords()
	$screen = GetBoxedScreen(WinGetPos($WINTITLE), $FIXEDRATIO)
	MsgBox(0, "Test", RevertPos(MouseGetPos(0),0,$screen) &":"& RevertPos(MouseGetPos(1),1,$screen) ) 
EndFunc
Func SwitchFlag()
	$running = Not $running
	If Not $running Then Return 0
	Beep()
	RunLoop()
	$running = false
	Beep()
EndFunc

Func RunLoop()
	$click = $MOUSE_CLICK_LEFT
	; TODO: Verify coords on all window sizes
	$x = 775
	$y = 775
	
	For $i = 0 To $MAXLOOP*2
		
		If Not $running Then Return 1
		; Select sacrifice
		AnimMouse(500, $x, $y, $click)
		
		; Back to board
		If Not $running Then Return 1
		Sleep(1000)
		Send("{UP}")
		If WinActive($WINTITLE) <> $winHandle Then $running = false
	
		If Not $running Then Return 1
		; Select lane
		AnimMouse(1000, $x, $y, $click)
		
		; Back to hand
		If Not $running Then Return 1
		Sleep(500)
		Send("{DOWN}")
		Sleep(500)
		Send("{DOWN}")
		If WinActive($WINTITLE) <> $winHandle Then $running = false
		
		If Not $running Then Return 1
		; Select last card
		AnimMouse(500, $x, $y, $click)

	Next
EndFunc

Func AnimMouse($sleep, $x, $y, $click=Default)
	If $click = Default Then $click = $MOUSE_CLICK_LEFT
	RatioMove($x, $y)
	Sleep($sleep)
	If WinActive($WINTITLE) <> $winHandle Then
		$running = false
		Return
	EndIf
	RatioClick($x, $y, $click)
EndFunc

; Instead of hardcoded coords, all mouse interations will use a % from the window size
Func RatioClick($x, $y, $click=Default, $screen=Default)
	If $click = Default Then $click = $MOUSE_CLICK_LEFT
	MouseClick($click, ComputeX($x, $screen), ComputeY($y, $screen))
EndFunc
Func RatioMove($x, $y, $screen=Default)
	If $screen = Default Then $screen = GetBoxedScreen(WinGetPos($WINTITLE), $FIXEDRATIO)
	MouseMove(ComputeX($x, $screen), ComputeY($y, $screen))
EndFunc

; Convert % into pixel coordinates
Func ComputeX($percent, $screen=Default)
    Return ComputePos($percent, 0, $screen)
EndFunc
Func ComputeY($percent, $screen=Default)
    Return ComputePos($percent, 1, $screen)
EndFunc

Func ComputePos($ratio, $axis, $screen=Default)
	If $screen = Default Then $screen = GetBoxedScreen(WinGetPos($WINTITLE), $FIXEDRATIO)
	Return $ratio * $screen[2+$axis]/$PRECISION + $screen[$axis]
EndFunc
Func RevertPos($coord, $axis, $screen=Default)
	If $screen = Default Then $screen = GetBoxedScreen(WinGetPos($WINTITLE), $FIXEDRATIO)
    Return ($coord-$screen[$axis]) * $PRECISION/$screen[2+$axis]
EndFunc

; Function to check if a Steam shortcut is already running
Func SteamCheck($processName, $windowTitle, $steamId, $sleep=Default, $timeout=Default)
	If $sleep = Default Then $sleep = 0
	If $timeout = Default Then $timeout = 0
	
	$loading = Not ProcessExists($processName)
	If $loading Then
		ShellExecute("steam://rungameid/"&$steamId)
	Else
		$timeout=1
	EndIf
	
	$result = WinWait($WINTITLE, "", $timeout)
	If $result = 0 Then
		If $loading Then
			MsgBox(0, "Process error", "Process launched, but no window titled "&$windowTitle)
		Else
			MsgBox(0, "Window error", "Launched steam command, but no window titled "&$windowTitle)
		EndIf
		Exit(0)
	EndIf
	
	If $loading And $sleep > 0 Then Sleep($sleep)
	Return $result
EndFunc

; Converts the result of WinGetPos with software's fixed letterbox in mind
Func GetBoxedScreen($screen, $ratio)
	If $ratio <= 0 Then Return $screen
	
	local $corrected[4]
	For $i = 0 To 3
		$corrected[$i] = $screen[$i]  
	Next

	; Beware of reverted indexes!
	$corrected[2] = $screen[3]*$ratio
	$corrected[3] = $screen[2]/$ratio

	For $i = 2 To 3
		If $corrected[$i] > $screen[$i] Then
			$corrected[$i] = $screen[$i]
		Else
			$corrected[$i-2] = $corrected[$i-2]+(($screen[$i]-$corrected[$i])/2)
		EndIf
	Next

	Return $corrected
EndFunc
