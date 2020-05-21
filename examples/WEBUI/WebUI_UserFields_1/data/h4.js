let onof
let source
function ajax(url,decode=true){
//    console.warn("AJAX START")
    document.body.style.cursor = "wait";
    var http = new XMLHttpRequest();
    var fullurl="http://"+window.location.hostname+"/rest/"+url;
    http.open('GET', fullurl);
    let r=document.getElementById("reply")
    http.addEventListener("load", function(e){
//        console.warn("AJAX FINISH")
        document.body.style.cursor = "default";
        if(decode){
            r.innerHTML=""
            r.style.color="#ffffff" // css
            var j=JSON.parse(e.currentTarget.responseText);
            if(!j.res) j.lines.forEach(function(l){ r.innerHTML+=l+'\n'})
            else {
                r.innerHTML="Error: "+j.res+" "+j.msg
                r.style.color="#d35400" // css
            }
        }
    });
    http.send();  
}

function redgreen(id,b){
    let i=document.getElementById(id)
    i.classList.remove(b ? "led-red":"led-green");
    i.classList.add(b ? "led-green":"led-red");  
} 

function uiItem(d,h="uhang"){
    let parts=d.split(",");
    let n=parts[0]
    if(!document.getElementById(n)){
        let t=parseInt(parts[1])
        let v=parts[2]
        let a=parseInt(parts[3])
//        console.warn("ACTIVE = ",a);
        let title=document.createElement("div");
        title.innerHTML=n;
        let valu=document.createElement("div");
        valu.id=n;
        valu.className="uv";
        switch(t){
            case 0: // label
                valu.innerHTML=v;
//                console.warn("ADD EL LABEL",n);
                source.addEventListener(n, function(e){ console.warn(" Event ",n," ",e.data); document.getElementById(n).innerHTML=e.data; });
                break;
            case 1:
                break;
            case 2:
                let b=parseInt(v);
                valu.classList=(a ? "uia ":"")+"ld led-"+(b ? "green":"red");
                source.addEventListener(n, function(e){ console.warn(" Event ",n," ",e.data); redgreen(n,parseInt(e.data)); });
                if(a) {
                    valu.addEventListener("click", function(e){ 
                        ajax("h4/asws/uib/"+n+","+(valu.classList.value.indexOf("red")==-1 ? 0:1)) },
                        {capture: true});
                    title.classList.add("tuia");
                }
                break;
            default:
                console.warn("WTF ",t);
        }
        let hangoff=document.getElementById(h);
        hangoff.insertBefore(title,null)
        hangoff.insertBefore(valu,null)
        //hangoff.appendChild(title);
        //hangoff.appendChild(valu);
    } else console.warn(n," already exists ",d);
}
let dt;

function has(id){ return document.getElementById("has"+id).value!="?" }

document.addEventListener("DOMContentLoaded", function() {
    let dt=new Date;
    if(!!window.EventSource) source=new EventSource("/evt");
    let rr=document.getElementById("reply")
//	let hasonof=parseInt(document.getElementById("hasonof").value);
//	let ;
    let cmd=document.getElementById("cmd")
    let msg=document.getElementById("msg")
    // frig ap test
    //wifimode=2
    if(parseInt(document.getElementById("wifi").value)==2) document.getElementById("ap").style.display='inline-grid'
    else {
        source.addEventListener('ui', function(e){ uiItem(e.data) });
        source.onmessage=function(e){
            let m=e.data;
            console.warn(" Message ",m);
            if(m.substr(0,2)!='ka'){ 
                msg.innerHTML=e.data;
                setTimeout(function () { msg.innerHTML="&nbsp;"; },30000);
            };
        }
//        source.onclose=function(e){ console.warn(" CLOSED ","e=",e); };        
//        source.onerror=function(e){ console.warn(" ERROR ","e=",e); ajax("FFS",false);source.close();  };    
        if(has("frnd")){
            frnd=document.getElementById("frnd");
            frnd.style.display='inline-flex'
        }
        if(has("onof")){
            onof=document.getElementById("onof");
            onof.parentNode.style.display='block'
            onof.addEventListener('click', function(e){ ajax("h4/toggle",false); });
            source.addEventListener('onof', function(e){ onof.src=parseInt(e.data) ? "on.jpg":"of.jpg" });
        }
        document.getElementById("cc").addEventListener('submit', function(e){
            e.preventDefault();
            ajax(cmd.value,true);
        },{capture: true});
        rr.addEventListener('click', function(e){
            let lines=rr.value.split("\n")
            let n=rr.value.substr(0, rr.selectionStart).split("\n").length
            cmd.value=lines[n-1]
            ajax(lines[n-1],true)
        },{capture: true});
        document.getElementById("qh").addEventListener('click', function(e){ ajax("help",true) }),{capture: true};
    } 
})