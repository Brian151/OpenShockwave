function Toggle(j) {
   !loggingEnabled||console.log("Toggling " + j);
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
   !loggingEnabled||console.log("Expanding All");
   divs=document.getElementsByClassName("xresource");
   for (i=0;i<divs.length;i++) {
     divs[i].style.display="block";
     key=document.getElementsByClassName("resource")[i];
     key.innerHTML="[-]";
   }
}
function Collapse() {
   !loggingEnabled||console.log("Collapsing All");
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
		!loggingEnabled||console.log("Clicked resource " + j);
		return function() {
			Toggle(j);
			return false;
		}
	}(i);
}