Hey, do you know... Buckshot Roulette?
You probably heard of that... roguelike horror-mood game where you either shoot at yourself or the dealer.  
I really wanted to do the 100%, but it seems I'm not as good as my streamer friends  
So I wasted time. This script WON'T help with cheating, however it helps with something else : TIME.
You know how each time you lose you go back to kinda long animations requiring click to go on, and how a manual reset also resets the window's status?
Imagine that when trying to farm a few games per day over more than a week. It... becomes annoying at some point. Especially as you can't type your name with the real-life keyboard
Well... that's that : an automation to be able to relax for 20-30 seconds while the game is reinitialized properly.

When this autoIt script is launched, steam will launch buckshot roulette
Then, if the Enter key is pressed, two things will happen thanks to mouse hijacking : 
1) If the window is on a small size, it will maximize it and leave the main menu
2) It will then initiate endless mode, go through the launch game sequence, start entering the player name, and put the mouse to hover the ENTER key

It won't CLICK on enter, because Endless Mode score depends on a timer which (as far we know) starts when confirming the name.  
I was tempted to add a sound signal when you are past the recommend time to reach achievements easily, but I decided against it as it would be *very* close to automated assistance  
It's more meant as some QOL tool for when streaming the game to friends
