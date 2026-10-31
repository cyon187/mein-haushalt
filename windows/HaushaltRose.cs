// HaushaltRose.exe (Rosé-Variante): entpackt die eingebettete Web-App nach %LOCALAPPDATA%\HaushaltRose\app,
// startet einen kleinen Server auf http://localhost:47812 und öffnet die App als eigenes Fenster
// (Edge-App-Modus, ohne Browserleiste).
// Alle Daten werden automatisch in Dokumente\HaushaltRose\haushalt-daten.json gespeichert,
// die vorige Fassung bleibt als haushalt-daten.bak.json liegen.
using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Mein Haushalt")]
[assembly: AssemblyProduct("Mein Haushalt")]
[assembly: AssemblyVersion("1.1.0.0")]

static class HaushaltRose
{
    const int PORT = 47812;
    static string appDir, dataFile, bakFile, winFile;
    // Breite,Höhe,X,Y,maximiert – Größen mit Untergrenze, damit ein kaputter Wert kein unsichtbares Fenster ergibt
    static readonly Regex WINDOW = new Regex(@"^([3-9]\d\d|[1-9]\d{3}),([3-9]\d\d|[1-9]\d{3}),(-?\d{1,4}),(-?\d{1,4}),([01])$");
    static long lastPing = DateTime.UtcNow.Ticks;
    static readonly object fileLock = new object();

    [STAThread]
    static void Main()
    {
        try
        {
            // eigene Ordner, damit sich die Rosé-Variante nie mit der grünen App mischt
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HaushaltRose");
            appDir = Path.Combine(root, "app");
            Directory.CreateDirectory(appDir);
            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "HaushaltRose");
            Directory.CreateDirectory(dataDir);
            dataFile = Path.Combine(dataDir, "haushalt-daten.json");
            bakFile = Path.Combine(dataDir, "haushalt-daten.bak.json");

            string edge = FindEdge();
            if (edge == null)
            {
                MessageBox.Show("Microsoft Edge wurde nicht gefunden. Haushalt braucht Edge, um das Fenster anzuzeigen.", "Mein Haushalt", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            // Fenster wie beim letzten Mal: klein, groß oder maximiert (die App meldet ihre Größe, Edge merkt sie sich hier nicht)
            winFile = Path.Combine(root, "fenster.txt");
            string window = " --window-size=460,900";
            Match w = File.Exists(winFile) ? WINDOW.Match(File.ReadAllText(winFile)) : Match.Empty;
            if (w.Success)
                window = w.Groups[5].Value == "1" ? " --start-maximized"
                    : " --window-size=" + w.Groups[1].Value + "," + w.Groups[2].Value + " --window-position=" + w.Groups[3].Value + "," + w.Groups[4].Value;
            string args = "--app=http://localhost:" + PORT + "/ --user-data-dir=\"" + Path.Combine(root, "profile") + "\""
                + window + " --no-first-run --no-default-browser-check --disable-background-mode";

            HttpListener listener = new HttpListener();
            listener.Prefixes.Add("http://localhost:" + PORT + "/");
            try { listener.Start(); }
            catch (HttpListenerException)
            {
                // Server läuft schon (App ist bereits offen): nur ein weiteres Fenster öffnen
                Process.Start(new ProcessStartInfo(edge, args) { UseShellExecute = false });
                return;
            }

            // bei jedem Start neu entpacken, damit Updates der exe sofort greifen
            Assembly asm = Assembly.GetExecutingAssembly();
            foreach (string name in asm.GetManifestResourceNames())
            {
                using (Stream src = asm.GetManifestResourceStream(name))
                using (FileStream dst = File.Create(Path.Combine(appDir, name)))
                    src.CopyTo(dst);
            }

            new Thread(() =>
            {
                while (listener.IsListening)
                {
                    HttpListenerContext ctx;
                    try { ctx = listener.GetContext(); } catch { break; }
                    ThreadPool.QueueUserWorkItem(_ => Handle(ctx));
                }
            }) { IsBackground = true }.Start();

            // Edge bleibt nach dem Schließen oft im Hintergrund und würde neue Fenster mit der alten Größe öffnen.
            // Kein Server lief, also ist kein Haushalt-Fenster offen: übrig gebliebenes Edge mit unserem Profil beenden.
            CloseLeftoverEdge(Path.Combine(root, "profile"));
            Process.Start(new ProcessStartInfo(edge, args) { UseShellExecute = false });

            // Die App meldet sich alle 20 s; ist das Fenster 90 s lang zu, beendet sich der Server
            while (new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref lastPing)).TotalSeconds < 90)
                Thread.Sleep(5000);
            listener.Stop();
        }
        catch (Exception e)
        {
            MessageBox.Show("Haushalt konnte nicht starten:\n" + e.Message, "Mein Haushalt", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    static void Handle(HttpListenerContext ctx)
    {
        HttpListenerRequest req = ctx.Request;
        HttpListenerResponse res = ctx.Response;
        try
        {
            res.AddHeader("Cache-Control", "no-cache");
            // Schutz: nur eigene Seite (kein DNS-Rebinding), Schreiben nur mit eigenem Header
            // (fremde Webseiten können ihn ohne Freigabe nicht mitschicken)
            if (req.Headers["Host"] != "localhost:" + PORT) { res.StatusCode = 403; return; }
            string path = req.Url.AbsolutePath;
            bool post = req.HttpMethod == "POST";
            if (post && req.Headers["X-Haushalt"] != "1") { res.StatusCode = 403; return; }

            if (path == "/api/ping" && post)
            {
                Interlocked.Exchange(ref lastPing, DateTime.UtcNow.Ticks);
                res.StatusCode = 204;
            }
            else if (path == "/api/window" && post)
            {
                string body;
                using (StreamReader r = new StreamReader(req.InputStream, Encoding.ASCII)) body = r.ReadToEnd().Trim();
                if (!WINDOW.IsMatch(body)) { res.StatusCode = 400; return; }
                File.WriteAllText(winFile, body);
                res.StatusCode = 204;
            }
            else if (path == "/api/data" && post)
            {
                string body;
                using (StreamReader r = new StreamReader(req.InputStream, Encoding.UTF8)) body = r.ReadToEnd();
                if (body.Length > 20000000 || !body.TrimStart().StartsWith("{")) { res.StatusCode = 400; return; }
                lock (fileLock)
                {
                    // älterer Stand (z. B. aus einem zweiten, veralteten Fenster) überschreibt nie einen neueren
                    if (File.Exists(dataFile) && SavedAt(body) < SavedAt(File.ReadAllText(dataFile, Encoding.UTF8))) { res.StatusCode = 409; return; }
                    // erst komplett in Temp-Datei schreiben, dann austauschen: kein halbes File bei Absturz
                    string tmp = dataFile + ".tmp";
                    File.WriteAllText(tmp, body, new UTF8Encoding(false));
                    if (File.Exists(dataFile)) File.Replace(tmp, dataFile, bakFile);
                    else File.Move(tmp, dataFile);
                }
                res.StatusCode = 204;
            }
            else if (path == "/api/data")
            {
                byte[] b;
                lock (fileLock) b = File.Exists(dataFile) ? File.ReadAllBytes(dataFile) : null;
                if (b == null) { res.StatusCode = 404; return; }
                res.ContentType = "application/json; charset=utf-8";
                res.OutputStream.Write(b, 0, b.Length);
            }
            else
            {
                string name = path == "/" ? "index.html" : Uri.UnescapeDataString(path.Substring(1));
                string file = Path.Combine(appDir, name);
                // nur Dateien direkt im App-Ordner ausliefern
                if (name.IndexOfAny(new[] { '/', '\\' }) >= 0 || name.Contains("..") || !File.Exists(file)) { res.StatusCode = 404; return; }
                res.ContentType = TypeOf(name);
                byte[] b = File.ReadAllBytes(file);
                res.OutputStream.Write(b, 0, b.Length);
            }
        }
        catch { res.StatusCode = 500; }
        finally { try { res.Close(); } catch { } }
    }

    static void CloseLeftoverEdge(string profile)
    {
        Func<int[]> ours = () =>
        {
            var ids = new System.Collections.Generic.List<int>();
            using (var q = new ManagementObjectSearcher("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='msedge.exe'"))
                foreach (ManagementObject p in q.Get())
                {
                    string cmd = (string)p["CommandLine"] ?? "";
                    if (cmd.IndexOf(profile, StringComparison.OrdinalIgnoreCase) >= 0) ids.Add((int)(uint)p["ProcessId"]);
                }
            return ids.ToArray();
        };
        int[] left = ours();
        if (left.Length == 0) return;
        // erst höflich (Edge speichert dann sauber), nach 5 s hart
        foreach (int id in left) Process.Start(new ProcessStartInfo("taskkill", "/PID " + id) { CreateNoWindow = true, UseShellExecute = false });
        for (int i = 0; i < 10 && ours().Length > 0; i++) Thread.Sleep(500);
        foreach (int id in ours()) try { Process.GetProcessById(id).Kill(); } catch { }
    }

    static long SavedAt(string json)
    {
        Match m = Regex.Match(json, "\"savedAt\"\\s*:\\s*(\\d+)");
        return m.Success ? long.Parse(m.Groups[1].Value) : 0;
    }

    static string TypeOf(string name)
    {
        switch (Path.GetExtension(name).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "application/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".png": return "image/png";
            case ".ics": return "text/calendar; charset=utf-8";
            default: return "application/octet-stream";
        }
    }

    static string FindEdge()
    {
        string[] bases = {
            Environment.GetEnvironmentVariable("ProgramFiles(x86)"),
            Environment.GetEnvironmentVariable("ProgramFiles"),
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        };
        foreach (string b in bases)
        {
            if (string.IsNullOrEmpty(b)) continue;
            string p = Path.Combine(b, @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(p)) return p;
        }
        return null;
    }
}
