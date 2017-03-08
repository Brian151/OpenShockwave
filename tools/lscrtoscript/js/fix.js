var loggingEnabled = false;

// Of course, Internet Exploder does not support the getElementsByClassName function used for detecting where the platforms are.
// Code From: Stack Overflow
if (!document.getElementsByClassName) {
    document.getElementsByClassName = function(className) {
        return this.querySelectorAll("." + className.replace(/ /g, "."));
    }
	// Exclude this line if writing a userscript!
    Element.prototype.getElementsByClassName = document.getElementsByClassName;
}