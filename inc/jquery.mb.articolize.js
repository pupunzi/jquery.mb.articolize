
(function(jQuery){
  jQuery.mbArticolize={
    name:"mb.articolize",
    author:"Matteo Bicocchi",
    version:"0.1",
    regexps: {
      tagToRemove:            /base|iframe|script|style|meta|input|textarea|select|option/i, //embed|object|
      hasNotRelevantChildren: /<(blockquote|dl|div|img|ol|p|pre|table)/i,
      videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
      negativeRe:             /combx|sponsor|comment|contact|foot|footer|header|footnote|link|media|socials|meta|promo|discussion|related|scroll|shoutbox|sponsor|widget|hidden|language|menu|navbar|contentRight|right|rightcontent|adsense|sidebar|info|sociable|share|topbar|jump|breadcrumb|leftnav|nav|maindx|mainsx|spalla|col-C|from-section|functions/i,
      negativeImgNames:       /email|marker|main|separator|spacer|spaceball|bgnd|smile|background|_bg|-bg|head|foot|emot|adver|line|dott|thumb|top|bottom|sidebar|blank|null|holder|btn|button|title|basket|avatar|banner/i
    },
    defaults:{
      imagesPlaceHolder:null,
      text:null,
      abstractLength:300,
      removeImagesFromHtml:false,
      baseUrl:false
    },

    totalScore:0,
    articolize:function(opt){
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
      articleHTML.find("script,style,iframe").remove();
      var articleTitle="";

      if (typeof articleHTML.toArray == "function")
        jQuery.each(articleHTML.toArray(),function(i) {

          if(this.tagName && this.tagName.toLowerCase()=="title"){
            articleTitle=this.innerHTML;
          }

          if(this.tagName && this.tagName.toLowerCase().search(jQuery.mbArticolize.regexps.tagToRemove) != -1){
            articleHTML.splice(jQuery.inArray(this,articleHTML),1);
          }
        });

      page.video=articleHTML.find("embed, object").filter(function(){return jQuery(this).get(0).innerHTML.search(jQuery.mbArticolize.regexps.videoRe) != -1}).clone();
      articleHTML.find("embed, object").filter(function(){return jQuery(this).get(0).innerHTML.search(jQuery.mbArticolize.regexps.videoRe) == -1}).remove();

      var imgsURL=[];
      var articleImages= articleHTML.find("img");

      page.images= articleImages
        .filter(function(){
        var img=jQuery(this);
        var getImg=img;
        if(img.attr("mbSrc") && img.attr("mbSrc").search(jQuery.mbArticolize.regexps.negativeImgNames) != -1)
          getImg=null;
        if(img.attr("height") && img.attr("height")<350)
          getImg=null;
        if(img.attr('width') && (img.attr('width')<350))
          getImg=null;
        if(getImg!=null)
          img.normalizeUrl(options.baseUrl, "mbSrc");
        return getImg;
      }).clone();

      page.images.each(function() {

        var img=jQuery(this);

        //if this image is already taken, remove it.
        if(jQuery.inArray(img.attr("mbSrc"),imgsURL)) {
          img.remove();
        }
        imgsURL.push(img.attr("mbSrc"));

        img.normalizeUrl(options.baseUrl, "mbSrc");
        img.attr("src",img.attr("mbSrc"));
        img.css("display","none");
        img.error(function(){jQuery(this).parent(".mbImgWrapper").remove();});
        img.load(function(){
          if (jQuery(this).width()<350 || jQuery(this).height()<350) {
            jQuery(this).parent(".mbImgWrapper").remove();
            return;
          }
          jQuery(this).fadeIn(500);
        });
        img.removeAttr("border").removeAttr("style").removeAttr("usemap");
      });

      //clean images inside article text
      articleImages.each(function() {

        var img=jQuery(this);

        if(img.attr("mbSrc") && img.attr("mbSrc").beginsWith("./")) {
          img.remove();
          return;
        }
        img.normalizeUrl(options.baseUrl, "mbSrc");
        img.attr("src",img.attr("mbSrc"));
      });

      page.title= articleTitle;
      page.title= page.title ? page.title : articleHTML.find("h1:first").clone().text();

      page.candidate= articleHTML.findCandidate(options);

      page.title= page.title ? page.title : page.candidate? page.candidate.find("h1:first").text():"";
      page.title= page.title ? page.title : page.candidate? page.candidate.find("h2:first").text():"";

      if(page.candidate) {
        page.candidate.find('a').each(function(){
          if(jQuery(this).attr("href") && jQuery(this).attr("href").indexOf("javascript")!=-1){
            jQuery(this).remove();
            return;
          }
          jQuery(this).normalizeUrl(options.baseUrl, "href");

        });
      }

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
        if( ! jQuery(this).mbIsValidTag()) return;
        var innerH=jQuery(this).contents().filter(function() {return this.nodeType == 3 && this.length>200; });
        if(innerH.parent().length>0 && innerH.parent().html().length>200 && innerH.parent().mbIsValidTag()){

          jQuery(this).wrap("<p class='wrap'/>");
        }
      });
      divs.filter(function(){return !$(this).mbIsValidTag()}).remove();

      var tds=$("<div/>");
      content.find("td").each(function(){
        //var innerH=jQuery(this).contents().filter(function() { return this.nodeType == 3; });
        //if(innerH.parent().length>0 && innerH.parent().html().length>200){
          var rep=jQuery("<p/>").html(jQuery(this).html());
          tds.add(rep);
          jQuery(this).parents("table").eq(0).before(rep);
        //}
      });

      var p=content.find("p").filter(function(i){return i<100 && jQuery(this).text().length>10});
      var div= divs.filter(function(){return $(this).contents().is("h1,h2,h3")});
      candidates = p.add(div);
      candidates.add(tds);

      if(candidates.length==0)
        candidates= content.filter("p");

      if(candidates.parent().length==0)
        candidates.wrapAll("<div/>");

      /*
       candidates.each(function(){
       jQuery(this).cleanContent(opt);
       jQuery(this).addContentScore();
       });
       */

      var bestCandidates= candidates.parent().cleanContent(opt);
      //var bestCandidates= content.find("[contentScore]");

      var candidate=bestCandidates.eq(0);

      bestCandidates.each(function(){

        if (!jQuery(this).mbIsValidTag() || ( jQuery(this).parent() && !jQuery(this).parent().mbIsValidTag()))
          return;

        var newCandidate= jQuery(this);

        candidate= newCandidate.text().length>candidate.text().length ? newCandidate : candidate;
        //candidate=parseFloat(newCandidate.attr("contentScore")) > parseFloat(candidate.attr("contentScore")) ? newCandidate : candidate;
      });
      candidate=candidate.text().length>100 ?candidate : null;
      //content.remove();

      return candidate;
    },
    isValidTag:function(){
      var isValid=true;
      if (jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("class"))
        || jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("id")))
        isValid=false;

      return isValid;
    },

    cleanContent: function (opt){
      var content= this;
      content.find('script,iframe,select,option,input,canvas,fieldset,button,table,tr,td').remove();/*hr,ol,ul,li,br,table,tr,td,style*/
      content.find("[id]").filter(function(){return jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("id"))}).remove();
      content.find("[class]").filter(function(){return jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("class"))}).remove();
      content.find("[class]").removeAttr("class");
      content.find("[color]").removeAttr("color");
      content.find("[style]").removeAttr("style");
      content.find("[width]").removeAttr('width');
      content.find("[height]").removeAttr('height');
      content.find("[size]").removeAttr('size');
      content.find("a").attr('target','_blank');
      content.find("div,p,span,li,ol").filter(function(){return jQuery(this).is(":empty")}).remove();/*ol,li,*/

      return content;
    },

    addContentScore:function () {
      var node = this;
      var parent = node.parent();
      var content= node.html();
      var contentScore= node.attr("contentScore") && node.attr("contentScore")>0?parseFloat(node.attr("contentScore")):0;

      switch(parent.tagName()) {
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
      contentScore += node.tagName()=="DIV"?node.find("img").length*5:0;
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

  jQuery.fn.tagName = function() {
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

    if(!baseURL) return;

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