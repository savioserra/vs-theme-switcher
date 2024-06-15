// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ConfigurationManager from "./ConfigurationManager";
import ThemeScheduler from "./ThemeScheduler";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "themeswitch" is now active!');
	

	ConfigurationManager.context=context;

	refresh();

	vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
		if (affectsConfiguration(ConfigurationManager.SESSION_NAME)) {
			refresh();
		}
	});


	//setInterval(refresh, 6e5); // Refresh in every ten minutes
}
const scheduler = new ThemeScheduler();

function refresh() {
	const mappings = ConfigurationManager.mappings;
	if (mappings) {
		scheduler.scheduleAll(mappings);
	}
}
// this method is called when your extension is deactivated
export function deactivate() {
	scheduler.clear();
}
