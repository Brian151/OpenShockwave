var out = document.getElementById("types");
function say(txt) {
	out.innerHTML = txt;
}
			
function highlight(id,txt) {
	var tgt = document.getElementById(id);
	tgt.style = "color:#ffffff;background:#000080;";
	out.innerHTML = txt;
}
function nohighlight(id) {
	var tgt = document.getElementById(id);
	tgt.style = "";
}

// from : https://www.sitepoint.com/removing-useless-nodes-from-the-dom/
function clean(node)
{
  for(var n = 0; n < node.childNodes.length; n ++)
  {
    var child = node.childNodes[n];
    if
    (
      child.nodeType === 8 
      || 
      (child.nodeType === 3 && !/\S/.test(child.nodeValue))
    )
    {
      node.removeChild(child);
      n --;
    }
    else if(child.nodeType === 1)
    {
      clean(child);
    }
  }
}

//clean(document.getElementById("root"));