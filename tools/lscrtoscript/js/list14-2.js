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

function Toggle(j) {
   obj=document.getElementsByClassName("xresource")[j];
   visible=(obj.offsetParent!=null)
   key=document.getElementsByClassName("resource")[j];
   if (visible) {
     obj.style.display="none";
     key.innerHTML="[+]";
   } else {
      obj.style.display="block";
      key.innerHTML="[-]";
   }
}
function Expand() {
   divs=document.getElementsByClassName("xresource");
   for (i=0;i<divs.length;i++) {
     divs[i].style.display="block";
     key=document.getElementsByClassName("resource")[i];
     key.innerHTML="[-]";
   }
}
function Collapse() {
   divs=document.getElementsByClassName("xresource");
   for (i=0;i<divs.length;i++) {
     divs[i].style.display="none";
     key=document.getElementsByClassName("resource")[i];
     key.innerHTML="[+]";
   }
}

var divs=document.getElementsByClassName("resource");
for(var i=0,len=divs.length;i<len;i++) {
	divs[i].onclick = function(j) {
		return function() {
			Toggle(j);
			return false;
		}
	}(i);
}