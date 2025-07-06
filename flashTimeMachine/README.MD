A combination of scripts to allow easy loading of multiple version of games with Steam  
Basically, two shortcuts are added to Steam :  

* The powershell script checks if a txt file exists along side the .exe , and if it does, forces the machine to run in QWERTY (en-US) as long the .exe is running  
Windows shortcuts allow to swap back-and-forth between the added controls and the previous ones, so it's possible to switch from the wrong-layout game to a correct-layout text software  
* The batch script does a hardlink "copy" of the exe (+ the txt file if needed) among a list of folders, to allow to seamlessly change the game's version to start with the powershell script  

As a result, the versioned exe's are always running on the same steamID, allowing to conserve screenshots, notes, etc. made through Steam's shortcuts  
