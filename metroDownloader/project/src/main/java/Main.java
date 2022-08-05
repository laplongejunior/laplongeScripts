import java.io.IOException;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.*;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;

public class Main 
{
	private static final String SELENIUM = "org.openqa.selenium.";
    private enum BROWSER {
        CHROME((driver,download)->{
        	// Sets the location of the driver without needing to add it to the path
        	// Makes way easier to integrate the tool into existing batches
            System.setProperty("webdriver.chrome.driver", driver);

            // Sets Chrome so that PDFs end in our specific folder rather than in the integrated viewer
            Map<String, Object> chromePrefs = new HashMap<>();
            if (download != null) {
                chromePrefs.put("plugins.always_open_pdf_externally", true);
                chromePrefs.put("download.prompt_for_download", false);
                chromePrefs.put("download.default_directory", download);
            }

            // If we load the browser the usual way, then we need *all drivers* during compilation
            // By using reflection, we only need the one specific driver at runtime
            final String PACKAGE = SELENIUM+"chrome.";
            try {
//                ChromeOptions options = new ChromeOptions();
                final Class<?> chromeClass = Class.forName(PACKAGE+"ChromeOptions");
                Object ChromeOptions = chromeClass.newInstance();
//                options.setExperimentalOption("prefs", chromePrefs);
                chromeClass.getMethod("setExperimentalOption", String.class, Object.class).invoke(ChromeOptions, "prefs", chromePrefs);
//                return new ChromeDriver(options);
                return (WebDriver) Class.forName(PACKAGE+"ChromeDriver").getConstructor(chromeClass).newInstance(ChromeOptions);
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        }, "crdownload", "tmp");
        
        private final BiFunction<String,String,WebDriver> init;
        private final Set<String> autoExts;
        private BROWSER(BiFunction<String,String,WebDriver> lambda, String... names) {
            init = lambda;
            autoExts = new HashSet<>(Arrays.asList(names));
        }
    }

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
    // During holidays there are less releases, thankfully the website provides the date of last release as well
    private static final Set<DayOfWeek> releaseDays = new HashSet<>(Arrays.asList(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY));
    public static void main(String[] args)
    {
        final String driverType = loadArg(0, args), driverPath = loadArg(1, args), downloadPath = loadArg(2, args);
        if (driverPath == null || downloadPath == null) {
            System.err.println("Missing argument");
            return;
        }
        Path fileDir = Paths.get(downloadPath);
        if (!Files.exists(fileDir)) {
            System.err.println("Download location doesn't exist");
            return;
        }
        
        BROWSER browser = BROWSER.valueOf(driverType);
        Main main = new Main();
        try { main.init(driverPath, fileDir, browser); }
        catch (Exception e) { e.printStackTrace(); }
        finally { main.stop(); }
    }
    private static String loadArg(int index, String... args) {
        return (index < args.length) ? args[index] : null;
    }

    private WebDriver driver = null;
    private void stop() {
        if (driver != null)
            driver.quit();
    }

    private void init(String driverPath, Path fileDir, BROWSER driverType) throws Exception {
        // Optimisation check 1 : check if the last expected newspaper already exists
    	LocalDate target = LocalDate.now();
        while (!releaseDays.contains(target.getDayOfWeek()))
            target = target.minusDays(1L);
        if (Files.exists(fileDir.resolve(target.format(formatter)+".pdf"))) return;
        
        Path tempPath = fileDir.resolve("temp");
        java.io.File tempDir = tempPath.toFile();
        tempDir.mkdir();
        
        driver = driverType.init.apply(driverPath, tempDir.getCanonicalPath());
        if (downloadPdf(driver, fileDir, tempPath, driverType))
            System.err.println("PDF file created");
        tempDir.delete();
    }
        
    // Given a specific folder, wait to handle new files in that folder, then calls the launch function
    // If launch returns FALSE, then execution is stopped
    // Else, for each new file it is sent to the onCreation event
    // Execution stops when onCreation returned TRUE for the number fo times equal to the amount parameter
    // To forcibly interrupt execution, throw a RunTimeException in onCreation
    private static boolean waitForPdfs(int amount, Path folder, Supplier<Boolean> launch, Function<Path,Boolean> onCreation) throws Exception {
        try (WatchService service = folder.getFileSystem().newWatchService()) {
            folder.register(service, StandardWatchEventKinds.ENTRY_CREATE);           
            // Start download
            if (!launch.get()) return false;
        
               // When the browser created the complete PDF, move it then close the browser
            WatchKey key;
            that_loop: while ((key = service.take()) != null) {
                // Dequeueing events
                for (WatchEvent<?> watchEvent : key.pollEvents()) {
                    if (watchEvent.kind() != StandardWatchEventKinds.ENTRY_CREATE) continue;
                    Path newPath = ((WatchEvent<Path>) watchEvent).context();
                    if (onCreation.apply(newPath) && --amount == 0) break that_loop;
                }
                if (!key.reset()) break;
            }
        }
        return true;
    }
    
    private boolean downloadPdf(WebDriver driver, Path fileDir, Path tempPath, BROWSER driverType) throws Exception {        
        return waitForPdfs(1, tempPath, ()->{
            driver.get("https://journal.metrotime.be/");
            WebDriverWait wait = new WebDriverWait(driver, java.time.Duration.ofSeconds(60));
            
            // Optimisation check 2 : check if the last actually released newspaper already exists
            Select dateSelect = new Select(wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("date_select"))));
            String latest = dateSelect.getOptions().stream().map(a->a.getAttribute("value")).max(String.CASE_INSENSITIVE_ORDER).orElse(null);
            if (Files.exists(fileDir.resolve(latest+".pdf"))) return Boolean.FALSE;
            
            // document.querySelector(".r--icon-pdf").click()
            WebElement button = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("r--icon-pdf")));
            if (button == null) return Boolean.FALSE;
            button.click();
            return Boolean.TRUE;
        },(newPath)->{
            // Only handles completely-formed files
            newPath = newPath.getFileName();
            String name = newPath.toString();
            int index = name.lastIndexOf(".");
            String ext = (index < 0) ? "" : name.substring(index+1);
            if (driverType.autoExts.contains(ext)) return Boolean.FALSE;
            
            // Move the file out of the temporary folder
            final String FLAG = "ME_JOURNAL,";
            index = name.indexOf(FLAG)+FLAG.length();
            name = name.substring(index, index+8)+"."+ext;
            try { Files.move(tempPath.resolve(newPath), fileDir.resolve(name)); }
            catch (IOException e) { throw new RuntimeException(e); }
            return Boolean.TRUE;
        });
    }
}
