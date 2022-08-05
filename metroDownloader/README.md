Small program that I created to download the free newspaper "Metro"  
This newspaper is freely available in printed form in most of our train stations, but it is inconvenient when teleworking
The goal is to automagically get the most recent newspaper added as a pdf by running a .bat file and waiting a few dozen seconds.

That program opens a browser (at the moment, Chrome) with the Selenium framework
Java creates a temporary subfolder and instructs Selenium to use a specific setup so that all opened pdfs end in that subfolder
When Selenium interacts with the newspaper's webpage and click on the download button, Java moves the new pdf into the download folder
Chrome is then closed and the temporary subfolder is deleted

To use it, download the driver from Selenium and create an empty folder
Start my .jar with three parameters : the type of browser you want to use ("CHROME" for now), the path to the .exe driver and the path to put the pdf
