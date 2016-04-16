/*https://github.com/bpampuch/pdfmake/issues/205
 content = []; ParseHtml(content, simpleHtm); pdfMake.createPdf({content: content}).download();
*/
var pdfMakeHTMLConverter = {

ParseContainer : function (cnt, e, p, styles, attributes, defStyle) {
    var elements = [];
    var children = e.childNodes;
    if (children.length != 0) {
        for (var i = 0; i < children.length; i++) p = pdfMakeHTMLConverter.ParseElement(elements, children[i], p, styles, attributes, defStyle );
    }
    if (elements.length != 0) {            
        for (var i = 0; i < elements.length; i++) cnt.push(elements[i]);
    }
    return p;
},

ComputeStyle : function (o, styles) {
    for (var i = 0; i < styles.length; i++) {
        var st = styles[i].trim().toLowerCase().split(":");
        if (st.length == 2) {
            switch (st[0]) {
                case "font-size":{
                    o.fontSize = parseInt(st[1]);
                    break;
                }
                case "text-align": {
                    switch (st[1]) {
                        case "right": o.alignment = 'right'; break;
                        case "center": o.alignment = 'center'; break;
                    }
                    break;
                }
                case "font-weight": {
                    switch (st[1]) {
                        case "bold": o.bold = true; break;
                    }
                    break;
                }
                case "text-decoration": {
                    switch (st[1]) {
                        case "underline": o.decoration = "underline"; break;
                    }
                    break;
                }
                case "font-style": {
                    switch (st[1]) {
                        case "italic": o.italics = true; break;
                    }
                    break;
                }
            }
        }
    }
},

ParseElement : function(cnt, e, p, styles, attributes, defStyle) {
    if (!styles) styles = [];
    if (e.getAttribute) {
        var nodeStyle = e.getAttribute("style");
        if (nodeStyle) {
            var ns = nodeStyle.split(";");
            for (var k = 0; k < ns.length; k++) styles.push(ns[k]);
        }
    }

    switch (e.nodeName.toLowerCase()) {
        case "#text": {
            var t = { text: e.textContent.replace(/\n/g, "") };
            if (styles) pdfMakeHTMLConverter.ComputeStyle(t, styles);
            p.text.push(t);
            break;
        }
        case "b":case "strong": {
            //styles.push("font-weight:bold");
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles.concat(["font-weight:bold"]), attributes, defStyle);
            break;
        }
        case "u": {
            //styles.push("text-decoration:underline");
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles.concat(["text-decoration:underline"]), attributes, defStyle);
            break;
        }
        case "i": {
            //styles.push("font-style:italic");
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles.concat(["font-style:italic"]), attributes, defStyle);
            //styles.pop();
            break;
            //cnt.push({ text: e.innerText, bold: false });
        }
        case "span": {
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles, attributes, defStyle);
            break;
        }
        case "br": {
            p = pdfMakeHTMLConverter.CreateParagraph(defStyle);
             p.text.push({ text: " "});
            cnt.push(p);
            break;
        }
        case "table":
            {
                var t = {
                    table: {
                        widths: [],
                        body: []
                    }
                }
                var border = e.getAttribute("border");
                var isBorder = false;
                if (border) if (parseInt(border) == 1) isBorder = true;
                if (!isBorder) t.layout = 'noBorders';
                pdfMakeHTMLConverter.ParseContainer(t.table.body, e, p, styles, attributes, defStyle);
                
                var widths = e.getAttribute("widths");
                if (!widths) {
                    if (t.table.body.length != 0) {
                        if (t.table.body[0].length != 0) for (var k = 0; k < t.table.body[0].length; k++) t.table.widths.push("*");
                    }
                } else {
                    var w = widths.split(",");
                    for (var k = 0; k < w.length; k++) t.table.widths.push(w[k]);
                }
                cnt.push(t);
                break;
            }
        case "tbody": {
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles, attributes, defStyle);
            //p = CreateParagraph();
            break;
        }
        case "tr": {
            var row = [];
            pdfMakeHTMLConverter.ParseContainer(row, e, p, styles, attributes, defStyle);
            cnt.push(row);
            break;
        }
        case "td": {
            p = pdfMakeHTMLConverter.CreateParagraph(defStyle);
            var st = {stack: []}
            st.stack.push(p);
            
            var rspan = e.getAttribute("rowspan");
            if (rspan) st.rowSpan = parseInt(rspan);
            var cspan = e.getAttribute("colspan");
            if (cspan) st.colSpan = parseInt(cspan);
            
            pdfMakeHTMLConverter.ParseContainer(st.stack, e, p, styles, attributes, defStyle);
            cnt.push(st);
            break;
        }
        case "div":case "p": {
            p = pdfMakeHTMLConverter.CreateParagraph(defStyle);
            var st = {stack: []}
            st.stack.push(p);
            pdfMakeHTMLConverter.ComputeStyle(st, styles);
            pdfMakeHTMLConverter.ParseContainer(st.stack, e, p, styles, attributes,defStyle);
            
            cnt.push(st);
            break;
        }
        case "a": {
            //p = pdfMakeHTMLConverter.CreateParagraph(defStyle);
            //var st = {stack: []}
            //st.stack.push(p);
            //pdfMakeHTMLConverter.ComputeStyle(st, styles);
            //pdfMakeHTMLConverter.ParseContainer(st.stack, e, p, styles, attributes, defStyle);
            pdfMakeHTMLConverter.ParseContainer(cnt, e, p, styles, attributes, defStyle);
            var href = e.getAttribute("href");
            //st.stack[0].link = href;
            //st.stack[0].decoration = "underline";
			pLast = p.text.length -1;
            p.text[pLast].link = href;
            p.text[pLast].decoration = "underline";
            //cnt.push(st);
            break;
        }   

        default: {
            console.log("Parsing for node " + e.nodeName + " not found");
            break;
        }
    }
    return p;
},

ParseHtml : function (cnt, htmlText, defStyle) {
    //debugger;
    //var cnt = [];
    var html = $(htmlText.replace(/\t/g, "").replace(/\n/g, ""));
    var p = pdfMakeHTMLConverter.CreateParagraph(defStyle);
    for (var i = 0; i < html.length; i++) pdfMakeHTMLConverter.ParseElement(cnt, html.get(i), p, [], [], defStyle);
    return;// cnt;
},

CreateParagraph : function(defStyle) {
    var p = {text:[]};
    if (defStyle) {
        p = {text:[], style : defStyle};
    } 
    return p;
}
};

