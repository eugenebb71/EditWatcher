# editwatcher README

This is the README for your extension "editwatcher".

## Features

This extension allows to show different types of messages on opening or start editing of a file.

Very useful way to warn a developer when he/she is about to start working with a file that requires extra attention. For example about the change autogenerated code 
that will be overwritten automatically.

if a file contains a comment with text like:

##INFO information message here

##WARN warning message here

##ERROR error message here

##STATUSBAR message to show in a status bar

it will be show as a message of corresponding type when you open the file. the message will be shown only once per VS code session. 
i.e. if you close and open the file again, the will not be shown.

if the comment contains :ALWAYS suffix, the message will be shown on every opening of the file.

if the comment contains :EDIT suffix, the message will be show once per session after you start editing of the file.

if the comment contains :EDIT:ALWAYS suffix, the message will be show every time you reopen the file right after you start editing of the file.

Examples:

// ##INFO info message here

// ##WARN:ALWAYS warning message here

-- ##ERROR:EDIT edit message here, in modal mode

/* ##STATUSBAR:EDIT:ALWAYS statusbar message here */


## Release Notes

editwatcher goes live.

### 1.0.0

Initial release of editwatcher
