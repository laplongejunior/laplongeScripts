It's a small userscript that I did to allow whitelisting Youtube/Twitch creators on adblockers  
The script reads the DOM to find the name of the creator, then adds it in the URL as a "user" parameter  
If you want, you can also use the whitelist in the script and whitelist a single URL in the adblocker
  
Examples on Youtube: https://youtu.be/EY8ifh2_9Og  
It becomes https://www.youtube.com/watch?v=EY8ifh2_9Og#user=UCc5uMs-C7XONKJMEg10jVrA&fullscreen=0 (channel without a custom or legacy name)  
https://youtu.be/dQw4w9WgXcQ => https://www.youtube.com/watch?v=dQw4w9WgXcQ#user=RickastleyCoUkOfficial&fullscreen=0  
  
Whitelist example for UBlockOrigin:  
twitch.tv/*user=qtgeekes  
twitch.tv/*user=rgotemtv  
twitch.tv/*whitelisted=1  
youtube.com/*user=joueurdugrenier  
youtube.com/*user=QuestcequetuGEEKes  
youtube.com/*whitelisted=1  
