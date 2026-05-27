[Setup]
AppName=Система учета регистрации заявок
AppVersion=1.0.0
AppPublisher=System Admin Tools
AppPublisherURL=https://github.com/ticket-system
DefaultDirName={pf}\TicketSystem
DefaultGroupName=Система учета регистрации заявок
UninstallDisplayIcon={app}\TicketSystem.exe
OutputDir=..\dist
OutputBaseFilename=TicketSystem-Setup-Windows-1.0.0
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
SetupIconFile=..\frontend\public\favicon.ico
DisableProgramGroupPage=yes

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create desktop shortcut"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Auto-start on login"; GroupDescription: "Startup:"

[Files]
Source: "..\dist\win-app\TicketSystem.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\win-app\README.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\backend\README.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Dirs]
Name: "{app}"

[Icons]
Name: "{group}\Система учета заявок"; Filename: "{app}\TicketSystem.exe"; WorkingDir: "{app}"
Name: "{group}\Удалить"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Система учета заявок"; Filename: "{app}\TicketSystem.exe"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\Система учета заявок"; Filename: "{app}\TicketSystem.exe"; WorkingDir: "{app}"; Tasks: autostart

[Run]
Filename: "{app}\TicketSystem.exe"; Description: "Запуск Системы учета регистрации заявок"; Flags: postinstall nowait skipifsilent shellexec

[UninstallRun]
Filename: "taskkill"; Parameters: "/f /im TicketSystem.exe"; Flags: runhidden
