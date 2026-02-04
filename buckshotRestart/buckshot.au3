#include <AutoItConstants.au3>
;$MOUSE_CLICK_LEFT = "left"
;$WIN_STATE_MAXIMIZED = 32
AutoItSetOption("WinTitleMatchMode",3)

$WINTITLE = "Buckshot Roulette"
$STEAMID = "2835570"
$FIXEDRATIO = 16/9

; Trigger endless mode?
$pills = True

$winHandle = SteamCheck("Buckshot Roulette.exe", $WINTITLE, $STEAMID, 10000)

;Sleep(2000)
;WinSetState($WINTITLE, "", @SW_MAXIMIZE)
;SetupGame()

;Debug2(930, 690) ; 485, 665 ; 484, 666
;Debug2(590, 640) ; 309, 618 ; 301, 618
;Debug2(550, 760) ; 288, 733 ; 280, 733
;Debug2(1160, 520) ; 603, 504 ; 607, 504
;Debug2(250, 480) ; 133, 466 ; 119, 466
;Debug2(950, 300) ; 495, 294 ; 495, 294
;Debug2(1160, 470) ; 603, 456 ; 607, 456
;Debug2(1140, 230) ; 593, 227 ; 597, 227
;Debug2(1170, 530) ; 608, 513 ; 613, 513
;Debug2(1340, 340) ; 696, 332 ; 704, 332

While WinWait($WINTITLE, "", 1)
	If WinActive($winHandle) Then
		HotKeySet("{Enter}", "SetupGame")
	Else
		HotKeySet("{Enter}", "")
	EndIf
	Sleep(1000)
WEnd
HotKeySet("{Enter}", "")
Exit(0)

;Func TestWindowFunc()
;	MsgBox(0, "Test", WinActive($winHandle) & ":" &  WinGetState($winHandle), 10)
;EndFunc
;Func Debug()
;	$temp = MouseGetPos()
;	MsgBox(0, "Test", "Current mouse pos:" & $temp[0] & ":" & $temp[1], 10)
;EndFunc
;Func Debug2($x, $y)
;	$posX = RevertPos($x, 0)
;	$posY = RevertPos($y, 1)
;	MsgBox(0, "Test", $x&":"& $y & " = " & $posX&":"&$posY)
;EndFunc

Func SetupGame()
	If Not WinActive($winHandle) Then Return 0
	
	If Not BitAND(WinGetState($winHandle), $WIN_STATE_MAXIMIZED) Then
		$stateWait = 2000
		RatioClick(484, 666)
		Sleep($stateWait)
		WinSetState($WINTITLE, "", @SW_MAXIMIZE)
		Sleep(10000-$stateWait)
	EndIf
	If $pills Then
		TriggerEndless(301, 618)
		RatioMove(607, 504)
		Sleep(4000)
	EndIf
	MeetDealer(607, 504)
	RatioMove(607, 456)
	Sleep(3000)
	EnterName(607, 456)
EndFunc

Func TriggerEndless($x, $y)
	RatioClick($x, $y)
	AnimMouse(2000, 280, 733)
EndFunc

Func MeetDealer($x, $y)
	RatioClick($x, $y)
	VolumeMouse(2000, 5000, 119, 466)
	VolumeMouse(4000, 10000, 495, 294)
EndFunc

Func EnterName($x, $y)
	$screen = GetBoxedScreen(WinGetPos($WINTITLE), $FIXEDRATIO)
	RatioClick($x, $y, $screen)
	RatioClick(597, 227, $screen)
	RatioClick(613, 513, $screen)
	RatioMove(704, 332, $screen)
EndFunc

; Temporarily turn off the volume during an interaction
Func VolumeMouse($volTimer, $sleep, $x, $y, $click=Default)
	Sleep($volTimer)
	; WARNING: Will *restore* sound temporarily if the settings were naturally on mute
	Send("{VOLUME_MUTE}")
	AnimMouse($sleep-$volTimer, $x, $y, $click)
EndFunc
; High-speed mouse movement doesn't seem to work well in UIs with custom pointer
; Instead, the mouse will move at regular speed during transitions
Func AnimMouse($sleep, $x, $y, $click=Default)
	If $click = Default Then $click = $MOUSE_CLICK_LEFT
	RatioMove($x, $y)
	Sleep($sleep)
	RatioClick($x, $y, $click)
EndFunc

; Instead of hardcoded coords, all mouse interations will use a % from the window size
Func RatioClick($x, $y, $click=Default, $screen=Default)
	If $click = Default Then $click = $MOUSE_CLICK_LEFT
	If Not WinActive($WINTITLE) Then Return 0
	MouseClick($click, ComputeX($x, $screen), ComputeY($y, $screen))
EndFunc
Func RatioMove($x, $y, $screen=Default)
	If Not WinActive($WINTITLE) Then Return 0
	MouseMove(ComputeX($x, $screen), ComputeY($y, $screen))
EndFunc

Func ComputeX($percent, $screen=Default)
    Return ComputePos($percent, 0, $screen)
EndFunc
Func ComputeY($percent, $screen=Default)
    Return ComputePos($percent, 1, $screen)
EndFunc

$PRECISION = 1000
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