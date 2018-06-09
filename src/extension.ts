'use strict';

import * as vscode from 'vscode';

class MessagesData {
    Console: string[] = [];
    Info: string[] = [];
    Warn: string[] = [];
    Error: string[] = [];
    StatusBar: string[] = [];
    StatusBarTimeout: number = 0;
}

interface FileMessageDictionary {
    [key: string]: MessagesData;
}

interface FileNameFlags {
    [key: string]: boolean;
}

class EditWatcherExt {

    private _onOpenTextDocument: vscode.Disposable;
    private _onCloseTextDocument: vscode.Disposable;
    private _onTextDocumentChanged: vscode.Disposable[] = [];

    private _editMessages: FileMessageDictionary = {};
    private _editAlwaysMessages: FileMessageDictionary = {};

    private _editShownMessages: FileNameFlags = {};
    private _filesShownMessages: FileNameFlags = {};

    private _prevouslyEditedFileName: string = '';

    constructor() {
        this._onOpenTextDocument = vscode.workspace.onDidOpenTextDocument(e => this.showMessages([e]));
        this._onCloseTextDocument = vscode.workspace.onDidCloseTextDocument(e => this.OnCloseTextDocument(e));

        if (vscode.workspace != null && vscode.workspace.textDocuments != null) {
            this.showMessages(vscode.workspace.textDocuments);
        }
    }

    private OnCloseTextDocument(e: vscode.TextDocument) {
        delete this._editMessages[e.fileName];
        delete this._editAlwaysMessages[e.fileName];

        this.UpdateEditEvent();
    }

    private displayMessages(msgs: MessagesData) {
        if (msgs.Console.length > 0) {
            console.log(msgs.Console.join('\r\n'));
        }

        if (msgs.Info.length > 0) {
            vscode.window.showInformationMessage(msgs.Info.join('\r\n'));
        }

        if (msgs.Warn.length > 0) {
            vscode.window.showWarningMessage(msgs.Warn.join('\r\n'));
        }

        if (msgs.Error.length > 0) {
            vscode.window.showErrorMessage(msgs.Error.join('\r\n'), { modal: true });
        }

        if (msgs.StatusBar.length > 0) {
            if (msgs.StatusBarTimeout > 0)
                vscode.window.setStatusBarMessage(msgs.StatusBar.join('\r\n'), msgs.StatusBarTimeout);
            else
                vscode.window.setStatusBarMessage(msgs.StatusBar.join('\r\n'));
        }
    }

    private showMessages(docs: vscode.TextDocument[]) {
        let msgs = new MessagesData();

        docs.forEach(d => {
            if (d.uri.scheme === 'file') {
                let fileName: string = d.fileName.replace(/^.*[\/\\]/, '');
                let src: string = d.getText();
                if (src != null) {
                    let re = new RegExp('(--|//|/\*)\\s*##(CONSOLE|WARN|INFO|ERROR|STATUSBAR):?(\\d+|EDIT:ALWAYS|EDIT|ALWAYS)?\\s+(.*)\\s*$', 'gm');
                    let found: RegExpExecArray | null;

                    let editMsgs = new MessagesData();
                    let editAlwaysMsgs = new MessagesData();

                    while ((found = re.exec(src)) !== null) {
                        let cmd: string = found[2];
                        let option: string = found[3];
                        let v: string = found[4];
                        if (v && v.length === 0)
                            continue;

                        let txt: string = fileName + ': ' + v;

                        let addMsgs = null;
                        if (option === 'EDIT')
                            addMsgs = editMsgs;
                        else if (option === 'EDIT:ALWAYS')
                            addMsgs = editAlwaysMsgs;
                        else if (option == 'ALWAYS' || !this._filesShownMessages[d.fileName])
                            addMsgs = msgs;

                        if (addMsgs == null)
                            continue;

                        if (cmd === 'CONSOLE') {
                            addMsgs.Console.push(txt);
                        } else if (cmd === 'INFO') {
                            addMsgs.Info.push(txt);
                        } else if (cmd === 'WARN') {
                            addMsgs.Warn.push(txt);
                        } else if (cmd === 'ERROR') {
                            addMsgs.Error.push(txt);
                        } else if (cmd === 'STATUSBAR') {
                            addMsgs.StatusBar.push(txt);

                            if (option && /^\d+$/.test(option)) {
                                let seconds: number = Number.parseInt(found[3]) * 1000;
                                if (seconds > addMsgs.StatusBarTimeout)
                                    addMsgs.StatusBarTimeout = seconds;
                            }
                        }
                    }

                    this._filesShownMessages[d.fileName] = true;

                    if (editAlwaysMsgs.Console.length > 0 || editAlwaysMsgs.Info.length > 0 || editAlwaysMsgs.Warn.length > 0 || editAlwaysMsgs.Error.length > 0 || editAlwaysMsgs.StatusBar.length > 0) {
                        this._editAlwaysMessages[d.fileName] = editAlwaysMsgs;
                    }

                    if (!this._editShownMessages[d.fileName]) {
                        if (editMsgs.Console.length > 0 || editMsgs.Info.length > 0 || editMsgs.Warn.length > 0 || editMsgs.Error.length > 0 || editMsgs.StatusBar.length > 0) {
                            this._editMessages[d.fileName] = editMsgs;
                        }
                    }
                }
            }
        });

        this.displayMessages(msgs);

        if ((Object.keys(this._editMessages).length > 0 || Object.keys(this._editAlwaysMessages).length) > 0 && this._onTextDocumentChanged.length == 0) {
            this._onTextDocumentChanged.push(vscode.workspace.onDidChangeTextDocument(e => this.documentChanged(e)));
        }
    }

    private documentChanged(e: vscode.TextDocumentChangeEvent) {
        if (this._prevouslyEditedFileName === e.document.fileName)
            return;

        this._prevouslyEditedFileName = e.document.fileName;

        if (!this._editShownMessages[e.document.fileName]) {
            let editMsgs = this._editMessages[e.document.fileName];
            if (editMsgs && (editMsgs.Console.length > 0 || editMsgs.Info.length > 0 || editMsgs.Warn.length > 0 || editMsgs.Error.length > 0 || editMsgs.StatusBar.length > 0)) {
                this.displayMessages(editMsgs);
                delete this._editMessages[e.document.fileName];
                this._editShownMessages[e.document.fileName] = true;
            }
        }

        let editAlwaysMsgs = this._editAlwaysMessages[e.document.fileName];
        if (editAlwaysMsgs && (editAlwaysMsgs.Console.length > 0 || editAlwaysMsgs.Info.length > 0 || editAlwaysMsgs.Warn.length > 0 || editAlwaysMsgs.Error.length > 0 || editAlwaysMsgs.StatusBar.length > 0)) {
            this.displayMessages(editAlwaysMsgs);
            delete this._editAlwaysMessages[e.document.fileName];
        }

        this.UpdateEditEvent();
    }

    private UpdateEditEvent() {
        if (Object.keys(this._editMessages).length <= 0 && Object.keys(this._editAlwaysMessages).length <= 0 && this._onTextDocumentChanged.length > 0) {
            let e = this._onTextDocumentChanged.pop();
            if (e)
                e.dispose();
        }
    }

    dispose() {
        this._onOpenTextDocument.dispose();
        this._onCloseTextDocument.dispose();
        this._onTextDocumentChanged.forEach(e => e.dispose());
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(new EditWatcherExt());
}

export function deactivate() {
}