
(function(jQuery){
  jQuery.mbArticolize={
    name:"mb.articolize",
    author:"Matteo Bicocchi",
    version:"1.0",
    regexps: {
      tagToRemove:            /base|iframe|script|noscript|style|meta|input|textarea|select|option|nav|header|aside|summary|footer|embed|object|svg|MM:MEMCACHED/i, //embed|object|
      videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
      negativeRe:             /combx|header|sponsor|comment|respond|comment|banner|contact|foot|footer|header|bottom|side|footnote|link|media|socials|meta|promo|discussion|related|scroll|shoutbox|sponsor|hidden|language|menu|navbar|contentRight|rightcontent|adsense|Advertis|sidebar|info|sociable|topbar|jump|breadcrumb|leftnav|nav|maindx|mainsx|spalla|col-C|from-section|functions|twitter|facebook|submission|follow|articles-charts|breadcrumb|utility|bnnr|jp-post-flair|feed/i, //share|form
      negativeImgNames:       /email|marker|main|separator|spacer|spaceball|bgnd|smile|background|_bg|-bg|head|foot|emot|adv|line|dott|thumb|top|bottom|sidebar|blank|null|holder|btn|button|title|basket|avatar|banner/i
    },
    defaults:{
      imagesPlaceHolder:null,
      text:null,
      abstractLength:300,
      removeImagesFromHtml:false,
      baseUrl:false
    },
    articolize:function(opt) {
      var page= new Object();
      var options={};
      jQuery.extend(options,jQuery.mbArticolize.defaults,opt);

      var articleHTML="";

      var content= options.text ? options.text : this.html().clone();

      //prevent any scripts to be executed on load and clean the content
      content = content
        .replace(/onload/gi,"mbOnload")
        .replace(/\<base/gi,"<mbBase")
        .replace(/\<link/gi,"<mbLink")
        .replace(/link\>/gi,"mbLink>")
        .replace(/onerror/gi,"mbOnerror")
        .replace(/onclick/gi,"mbOnclick")
        .replace(/onmouseover/gi,"mbOnmouseover")
        .replace(/onmouseout/gi,"mbOnmouseout")
        .replace(/src=/gi, 'mbSrc=')
        .replace(/face=/gi, 'mbFace=');



      articleHTML= jQuery(content);

      for (var i in articleHTML){
        if(articleHTML[i].tagName && articleHTML[i].tagName.toLowerCase() === "title"){
          page.title = articleHTML[i].innerHTML;
          break;
        }
      }

      page.video=articleHTML.find("embed, object").filter(function(){return jQuery(this).get(0).innerHTML.search(jQuery.mbArticolize.regexps.videoRe) != -1}).clone();

      var imgsURL=[];
      var articleImages= articleHTML.find("img");

      //clean images inside article text
      articleImages.each(function() {
        var img=jQuery(this);
        if(img.attr("mbSrc") && img.attr("mbSrc").beginsWith("./")) {
          img.remove();
          return;
        }

        if(img.attr("height") && img.attr("height")<350)
          img.remove();

        if(img.attr('width') && (img.attr('width')<350))
          img.remove();

        if(img.attr("mbSrc") && img.attr("mbSrc").search(jQuery.mbArticolize.regexps.negativeImgNames) != -1)
          img.remove();

        img.normalizeUrl(options.baseUrl, "mbSrc");
        img.attr("src",img.attr("mbSrc"));

      });
      page.images= articleImages.clone();
      page.candidate = articleHTML.findCandidate(options);

      jQuery(page.candidate).find("*").each(function(){

        if(!jQuery(this).mbIsValidTag()){
          jQuery(this).remove();
          return;
        }

        if(!jQuery(this).is("img") && jQuery(this).text() && jQuery(this).text().length<15 && jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).text())){
          jQuery(this).remove();
          return;
        }

        if(this.nodeType == 8){
          jQuery(this).remove();
          return;
        }

        if (this.nodeName == "A"){
          if(jQuery(this).attr("href") && jQuery(this).attr("href").indexOf("javascript")!=-1){
            jQuery(this).remove();
            return;
          }
          jQuery(this).normalizeUrl(options.baseUrl, "href");
        }
      });

      jQuery(page.candidate).find("*:empty").not("img,br").remove();

      if(jQuery(page.candidate).length)
        jQuery(page.candidate).cleanContent(opt);

      page.title= page.title ? page.title : page.candidate ? page.candidate.find("h1:first").text():"";
      page.candidate.find("h1:first").remove();

      page.candidateAbstract= page.candidate? page.candidate.getCandidateAbstract(options.abstractLength):"";

      if(page.candidate && options.removeImagesFromHtml)
        page.candidate.find("img").remove();
      return page;
    },

    /*ARTICOLIZE ------------------------------------------------------------------------------------------------------------------------------------------------*/

    findCandidate:function(opt){
      var content= this;
      var candidates={};

      var divs=content.find("div");
      divs.each(function(i){
        if( !jQuery(this).mbIsValidTag()){
          jQuery(this).remove();
          return;
        }
        var innerH=jQuery(this).contents().filter(function() {return this.nodeType == 3 && this.length>50; });
        if(innerH.parent().length>0 && innerH.parent().html().length>50 && innerH.parent().mbIsValidTag()){
          jQuery(this).wrap("<p class='wrap'/>");
        }else{
          delete this;
        }
      });
      var tds=jQuery("<div/>");

      content.find("td").each(function(){
        var rep=jQuery("<span/>").html(jQuery(this).html());
        tds.add(rep);
        jQuery(this).parents("table").eq(0).before(rep);
      });


      var p=content.find("p").filter(function(i){return i<100 && jQuery(this).text().length>10});
      var div= divs.filter(function(){return jQuery(this).contents().is("h1,h2,h3") || jQuery(this).text().length > 3000 });
      candidates = p.add(div);
      candidates.add(tds);

      if(candidates.length==0)
        candidates= content.filter("p");

      if(candidates.parent().length==0)
        candidates.wrapAll("<div/>");

      var bestCandidates= candidates.parent();
      var candidate=bestCandidates.eq(0);

      bestCandidates.each(function(){
        if (!jQuery(this).mbIsValidTag() || ( jQuery(this).parent() && !jQuery(this).parent().mbIsValidTag()))
          return;

        var newCandidate= jQuery(this);
        candidate= newCandidate.text().length>candidate.text().length ? newCandidate : candidate;
      });
      candidate=candidate.text().length>100 ?candidate : null;
      return candidate;
    },

    isValidTag:function(){
      var isValid=true;
      if (
        (this.attr("class") && jQuery.mbArticolize.regexps.negativeRe.test(this.attr("class").toLowerCase()))
          || (this.attr("id") && jQuery.mbArticolize.regexps.negativeRe.test(this.attr("id").toLowerCase()))
          || (this.attr("role") && jQuery.mbArticolize.regexps.negativeRe.test(this.attr("role").toLowerCase()))
          || (this.getTagName() && jQuery.mbArticolize.regexps.tagToRemove.test(this.getTagName().toLowerCase()))
//          || (this.nodeType == 3 && this.text().length<20 && jQuery.mbArticolize.regexps.negativeRe.test(this.text()))
        )
        isValid=false;
      return isValid;
    },

    cleanContent: function (opt){
      var content= this;
      content.find('script,noscript,iframe,select,option,input,canvas,fieldset,button,table,tbody,th,tr,td').remove();/*hr,ol,ul,li,br,table,tr,td,style*/
      content.find("[id]").filter(function(){return jQuery.mbArticolize.regexps.negativeRe.test(this.id)}).remove();
      content.find("[class]").filter(function(){return jQuery.mbArticolize.regexps.negativeRe.test(this.class)}).remove();
      content.find("[color]").removeAttr("color");
      content.find("[class]").removeAttr("class");
      content.find("[style]").removeAttr("style");
      content.find("[width]").removeAttr('width');
      content.find("[height]").removeAttr('height');
      content.find("[size]").removeAttr('size');
      content.find("a").attr('target','_blank');
      content.find("div,p,span,li,ol").filter(function(){return jQuery(this).is(":empty")}).remove();
      return content;
    },

    addContentScore:function () {
      var node = this;
      var parent = node.parent();
      var content= node.html();
      var contentScore= node.attr("contentScore") && node.attr("contentScore")>0?parseFloat(node.attr("contentScore")):0;

      switch(parent.getTagName()) {
        case 'DIV':
          contentScore += 5;
          break;

        case 'PRE':
        case 'TD':
        case 'BLOCKQUOTE':
          contentScore += 3;
          break;

        case 'ADDRESS':
        case 'OL':
        case 'UL':
        case 'DL':
        case 'DD':
        case 'DT':
        case 'LI':
        case 'FORM':
          contentScore -= 5;
          break;

        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
        case 'TH':
          contentScore -= 5;
          break;
      }

      /* For every li containing a link remove 5 points */
      contentScore += node.getTagName()=="DIV"?node.find("img").length*5:0;
      /* For every 100 characters in this paragraph, add another point. Up to 5 points. */
      contentScore += Math.min(Math.floor(node.text().length / 100));//, 5

      /* Add points for any commas within this paragraph */
      contentScore += content.split(',').length*5;
      contentScore += parent.siblings("h2").length>0?10:0;

      node.attr("contentScore", parseFloat(contentScore));

      var parentCS=0;

      parent.children("[contentScore]").each(function(){
        parentCS+= parseFloat(jQuery(this).attr("contentScore"));
      });

      parent.attr("contentScore",parentCS);
      var grandParent= parent.parent()? parent.parent():parent;
      var parentParentScore=0;
      grandParent.children("[contentScore]").each(function(){
        parentParentScore+=parseFloat(jQuery(this).attr("contentScore"));
      });

      grandParent.attr("contentScore",parentParentScore/2);
      return parseFloat(contentScore);
    },

    getCandidateAbstract:function(maxLength){
      var abstr= jQuery(this).clone();
      var cleanAbstr= abstr.html() ? abstr.html().replace(/\n/g,"").replace(/<br>/g,"\n") : "";
      abstr.html(cleanAbstr);
      maxLength = abstr.text().length>maxLength ? maxLength : abstr.text().length-1;
      var txt = abstr.text();
      txt = txt.substring(0,maxLength);
      var str= jQuery("<p>"+txt.replace(/\n/g,"<br>")+" ...</p>");

      str.contents().filter(function() {
        return this.nodeType == 3;
      })
        .wrap('<p></p>')
        .end()
        .filter('br')
        .remove();
      return str;
    }
  };

  jQuery.fn.cleanContent= jQuery.mbArticolize.cleanContent;
  jQuery.fn.addContentScore= jQuery.mbArticolize.addContentScore;
  jQuery.fn.findCandidate= jQuery.mbArticolize.findCandidate;
  jQuery.fn.getCandidateAbstract= jQuery.mbArticolize.getCandidateAbstract;
  jQuery.fn.mbArticolize= jQuery.mbArticolize.articolize;
  jQuery.fn.mbIsValidTag= jQuery.mbArticolize.isValidTag;

  jQuery.fn.getTagName = function() {
    if(this.get(0) && this.get(0).nodeType ==3)
      return "TEXTNODE";
    else if (this.get(0) && this.get(0).nodeType ==1)
      return this.get(0).tagName.toUpperCase();
    else return "COMMENT"
  };

  jQuery.fn.buildArticolizeGallery=function(){
    jQuery(".mbImgClone").remove();
    this.each(function(){
      var $el= jQuery(this);
      var t= $el.position().top;
      var l= $el.position().left;
      $el.click(
        function(){
          jQuery(this).css({position:""}).removeClass("mbImgHover");
          jQuery(document).unbind("click.removeClone");
          jQuery(".mbImgClone").remove();
          var $elClone= $el.clone().addClass("mbImgClone").css({width:$el.outerWidth()}).bind("click",function(){jQuery(".mbImgClone").remove();});
          $el.parent().append($elClone);
          $elClone.css({top:t, left:l});
          $elClone.animate({width:$el.children().outerWidth(),height:$el.children().outerHeight()},200, function(){jQuery(document).one("click.removeClone",function(){jQuery(".mbImgClone").remove();})})}
      )
        .hover(function(){jQuery(this).addClass("mbImgHover")},function(){jQuery(this).removeClass("mbImgHover")})
    })
  };


  jQuery.fn.normalizeUrl=function(baseURL, attributeName){

    if(!baseURL) return this;

    //    baseURL=decodeURI(baseURL);

    var splitURL=baseURL.split("/");
    var rootUrl= splitURL[0]+"//"+splitURL[2];
    var fileExtension= /.htm|.html|.xhtml|.php|.asp|.aspx|.jsp|.jspx|.jhtml|.lasso|.mspx|.page/i;

    this.each(function() {
      var url=jQuery(this).attr(attributeName);
      if (!url) return;

      var isAbsolute= url.beginsWith("http");
      var isAbsoluteToRoot= url.beginsWith("/");
      var isRelative = !isAbsolute && !isAbsoluteToRoot;

      if(isAbsolute)
        return jQuery(this).attr(attributeName, url);

      if(isAbsoluteToRoot)
        jQuery(this).attr(attributeName, rootUrl+url);

      if(isRelative){
        var path=baseURL+ (baseURL.endsWith("/") ? "" : "/" );
        path=splitURL[0]+"//";
        var up=url.beginsWith("../") ? countConsecutiveOccurrences("../",url, attributeName) : fileExtension.test(splitURL[splitURL.length-1])?1:0;

        url.replace("../","");
        for (var i=2; i<splitURL.length-up; i++){
          var u = splitURL[i];
          if(u)
            path+= u + (u.endsWith("/") ? "" : "/");
        }
        jQuery(this).attr(attributeName,path+url);
        jQuery(this).attr("origUrlsrc",path+url);
        return this;
      }
    });

    function countConsecutiveOccurrences(pattern, url, attributeName) {
      var result = 0;
      var pl = pattern.length;

      for (var i = 0; i < url.length; i = i + pl) {
        var p = url.substring(i, i + pl);

        if(jQuery.browser.msie && "href"==attributeName)
          if (p==pattern)
            result++;
      }

      return result;
    }
  };

  // string tools

  String.prototype.beginsWith = function(t, i) {
    if (!i) {
      return (t == this.substring(0, t.length));
    } else {
      return (t.toLowerCase() == this.substring(0, t.length).toLowerCase());
    }
  };

  String.prototype.endsWith = function(t, i) {
    if (!i) {
      return (t == this.substring(this.length - t.length));
    } else {
      return (t.toLowerCase() == this.substring(this.length - t.length).toLowerCase()); }
  };

  String.prototype.asId = function () {
    return this.replace(/[^a-zA-Z0-9_]+/g, '');
  };


})(jQuery);