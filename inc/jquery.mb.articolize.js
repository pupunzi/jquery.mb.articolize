
(function(jQuery){
  jQuery.mbArticolize={
    name:"mb.articolize",
    author:"Matteo Bicocchi",
    version:"0.1",
    regexps: {
      tagToRemove:            /title|base|br|link|style|iframe|small|script|textnode|meta|input|textarea|comment|select|option/i, //embed|object|
      hasNotRelevantChildren: /<(blockquote|dl|div|img|ol|p|pre|table)/i,
      videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
      negativeRe:             /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|tags|widget|post|entry/i,
      negativeImgNames:       /separator|spacer|bgnd|background|_bg|-bg|head|foot|emot|adver|line|dott|thumb|top|bottom|sidebar|blank|null|holder|btn|button|title|basket|avatar/i
    },
    defaults:{
      imagesPlaceHolder:null,
      text:null,
      abstractLength:300,
      removeImagesFromHtml:false,
      baseUrl:false,
      simplified:false
    },

    totalScore:0,
    articolize:function(opt){
      var page= new Object();
      var options={};
      jQuery.extend(options,jQuery.mbArticolize.defaults,opt);

      //prevent any scripts to be executed on load
      var articleHTML="";

      if (options.text){
        options.text = options.text
          .replace(/onload/gi,"mbOnload")
          .replace(/\<base/gi,"<mbBase")
          .replace(/onerror/gi,"mbOnerror")
          .replace(/onclick/gi,"mbOnclick")
          .replace(/onmouseover/gi,"mbOnmouseover")
          .replace(/onmouseout/gi,"mbOnmouseout")
          .replace(/src/gi, 'mbSrc');
        articleHTML= jQuery(options.text);
      }else{
        var c=this.clone();
        c.each(function(i){
          if (this.tagName || this.nodeType==1)
            this.innerHTML = this.innerHTML.replace(/onload/gi,"_onload");
        });
        articleHTML= $(c);
      }

      var newContent=[];
      articleHTML.each(function(i){
        if(this.tagName && this.tagName.toLowerCase()=="title"){
          page.title=this.innerHTML;
        }
        var tagname= this.tagName ? this.tagName.toLowerCase() : this.nodeType==3 ? "textnode" : "comment";
        if (!jQuery.mbArticolize.regexps.tagToRemove.test(tagname)){
          newContent.push(this);
        }
      });
      articleHTML= options.simplified ? articleHTML : $(newContent);

      page.title= page.title ? page.title : articleHTML.find("h1:first,h2:first").eq(0).text();
      page.video=articleHTML.find("embed, object").filter(function(){return jQuery(this).get(0).innerHTML.search(jQuery.mbArticolize.regexps.videoRe) != -1}).eq(0).clone();
      articleHTML.find("embed, object").remove();

      page.images= articleHTML.find("img")
        .filter(function(){
        var img=jQuery(this);
        var getImg=null;
        if(img.attr("height")>150)
          getImg=img;
        else if((/jpg|jpeg/i).test(img.attr("mbSrc")))
          getImg=img;
        if(img.attr("mbSrc") && img.attr("mbSrc").search(jQuery.mbArticolize.regexps.negativeImgNames) != -1)
          getImg=null;
        return getImg;
      }).clone().each(function(){
        var img=jQuery(this);
        img.attr("src",img.attr("mbSrc"));
        img.normalizeUrl(options.baseUrl);
        //img.attr("onerror", "$(this).getImgPlaceHolder('"+options.imagesPlaceHolder+"');");
        img.bind("error", function(){$(this).getImgPlaceHolder(options.imagesPlaceHolder);});
        img.css("display","none");
        img.bind("load",function(){$(this).fadeIn(500);});
        img.removeAttr("border").removeAttr("style").removeAttr("usemap");
      });

      page.candidate= articleHTML.findCandidate(options);

      page.candidateAbstract= page.candidate? page.candidate.getCandidateAbstract(options.abstractLength):"";
      if(page.candidate && options.removeImagesFromHtml)
        page.candidate.find("img").remove();
      return page;
    },
    findCandidate:function(opt){
      var content= jQuery(this).clone();
      var candidates={};

      /*SIMPLIFIED ---------------------------------------------------------------------------------------------------------------*/
      if(opt.simplified){

        var h1_h2=content.find("h1,h2");
        var p=content.find("p").filter(function(i){return i<40 && jQuery(this).html().length>100});
        jQuery.extend(candidates, h1_h2, p);

        var bestCandidates= candidates.parent();
        var candidate=bestCandidates.eq(0);
        bestCandidates.each(function(){
          var newCandidate= jQuery(this).cleanContent(opt);
          candidate=newCandidate.text().length>candidate.text().length ? newCandidate : candidate;
        });
        candidate=candidate.text().length>200 ?candidate : null;
        content.remove();
        return candidate;
      }
      /*END - SIMPLIFIED ---------------------------------------------------------------------------------------------------------*/

      var allParagraphs = content.find("p");
      jQuery.mbArticolize.totalScore=0;

      allParagraphs.each(function(){
        var $paragraph=jQuery(this);
        $paragraph.addContentScore();
      });

      var wrap=jQuery("<div/>");
      wrap.append(content);

      candidates=wrap.find("[contentScore]").not("table,tr,td");

      candidates.each(function(){
        jQuery(this).find("[contentScore]").each(function(){
          jQuery.mbArticolize.totalScore+=parseFloat(jQuery(this).attr("contentScore"));
        });
      });

      var topCandidate=null;

      candidates.each(function(i){
        var el=jQuery(this);
          var topScore=topCandidate?parseFloat(topCandidate.attr("contentScore")):0;
          var myScore= parseFloat(jQuery(this).attr("contentScore"));
          topCandidate=myScore>topScore?jQuery(this):topCandidate;
      });

      if(topCandidate && topCandidate.children("[contentScore]").length>1){
        var CandidateChildren= topCandidate.children("[contentScore]");
        var childrenTopCandidate=null;
        if(CandidateChildren.length<4){
          CandidateChildren.each(function(){
            var el=$(this);
            var canCandidate=true;
            canCandidate= el.tagName()!="FORM" && el.find("li, ol").filter(function(){return jQuery(this).length<20 && jQuery(this).children("a").length==0});
            if(canCandidate){
              var topScore=childrenTopCandidate?parseFloat(childrenTopCandidate.attr("contentScore")):0;
              var myScore= parseFloat(el.attr("contentScore"));
              childrenTopCandidate=myScore>topScore?el:childrenTopCandidate;
            }
          });
          topCandidate=childrenTopCandidate?childrenTopCandidate:topCandidate;
        }
      }
      topCandidate= topCandidate || (topCandidate && topCandidate.text().length>200)?topCandidate:jQuery("<div>no extract content available</div>");
      content.remove();
      return topCandidate.cleanContent(opt);
    },

    cleanContent: function (opt){
      var content= this;
      content.find('script,small,h1,h2,h3,h4,iframe,select,option,input,textarea,ol,ul,canvas,fieldset,button,br,hr').remove();
      content.find('img[mbsrc]').each(function(){jQuery(this).attr({"onerror":"$(this).getImgPlaceHolder('"+opt.imagesPlaceHolder+"');","src":jQuery(this).attr("mbSrc"), "style":""});});//.attr("src",jQuery(this).attr("mbSrc"))
      content.find("div,span,p,ol,li,a").filter(function(){return jQuery(this).is(":empty")||jQuery(this).html().length<10}).remove();
      content.find("[class]").removeAttr("class");
      content.find("[color]").removeAttr("color");
      content.find("[style]").removeAttr("style");
      content.find("p").filter(function(){return jQuery(this).html().length<35;}).remove();
      content.find("[id],[class]").filter(function(){return jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("id")) || jQuery.mbArticolize.regexps.negativeRe.test(jQuery(this).attr("class"))}).remove();
      content.find("a").attr('target','_blank');

      //  transform all DIVs without nested element in P
      var divs= content.find("DIV");
      divs.each(function(i){
        var node=jQuery(this).get(0);
        var $node=jQuery(this);
        if(node.innerHTML.search(jQuery.mbArticolize.regexps.hasNotRelevantChildren) === -1){
          var content=$node.html();
          var newContent= jQuery("<p/>").html(content);
          divs.splice(i,1,newContent);
        }
      });

      return content;
    },

    addContentScore:function () {
      var node = jQuery(this);
      var parent = node.parent()?node.parent():node;
      var content= node.html();
      var contentScore=node.attr("contentScore")>0?parseFloat(node.attr("contentScore")):0;
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
      contentScore += node.tagName()=="DIV"?jQuery(content).find("img").length*5:0;
      /* For every 100 characters in this paragraph, add another point. Up to 5 points. */
      contentScore += Math.min(Math.floor(node.text().length / 100));//, 5
      /* Add points for any commas within this paragraph */
      contentScore += content.split(',').length;
      contentScore += parent.siblings("h2").length>0?10:0;

      node.attr("contentScore", parseFloat(contentScore));
      var parentCS=0;
      parent.children("[contentScore]").each(function(){
        parentCS+= parseFloat(jQuery(this).attr("contentScore"));
      });
      parent.attr("contentScore",parentCS);
      var grandParent= parent.parent();
      var parentParentScore=0;
      grandParent.children("[contentScore]").each(function(){
        parentParentScore+=parseFloat(jQuery(this).attr("contentScore"));
      });
      grandParent.attr("contentScore",parentParentScore);
      return parseFloat(contentScore);
    },
    getCandidateAbstract:function(maxLength){
      var abstr= jQuery(this).clone();
      var cleanAbstr= abstr.html() ? abstr.html().replace(/\n/g,"").replace(/<br>/g,"\n") : "";
      abstr.html(cleanAbstr);
      var str= jQuery("<p>"+abstr.text().trim().substring(0,maxLength).replace(/\n/g,"<br>")+" ...</p>");

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

  jQuery.fn.tagName = function() {
    if(this.get(0).nodeType == 3)
      return "TEXTNODE";
    else if (this.get(0).nodeType ==1)
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

  jQuery.fn.getImgPlaceHolder=function(placeHolderURL){
    if(placeHolderURL)
      this.attr({width:150,height:150, src:placeHolderURL});
    else
      this.remove();
  };

jQuery.fn.normalizeUrl=function(baseURL){
  if(!baseURL) return;
  var splitURL=baseURL.split("/");
  var rootUrl= splitURL[0]+"//"+splitURL[2];

  this.each(function(){
    var imgPath=jQuery(this).attr("src");

    var isAbsolute= imgPath.beginsWith("http");
    var isAbsoluteToRoot= imgPath.beginsWith("/");
    var isRelative = !isAbsolute && !isAbsoluteToRoot;

    if(isAbsolute) return;

      if(isAbsoluteToRoot)
        jQuery(this).attr("src",rootUrl+imgPath);

    if(isRelative){
      var path=baseURL+"/";

      if(splitURL[splitURL.length-1].indexOf(".")>=-1) {
        path=splitURL[0]+"//";
          var up=imgPath.beginsWith("../")?countConsecutiveOccurrences("../",imgPath):1;
          imgPath.replace("../","");
          for (var i=2; i<splitURL.length-up; i++){
          path+=splitURL[i]+"/";
        }
      }
      jQuery(this).attr("src",path+imgPath);
        return this;
    }
  });

    function countConsecutiveOccurrences(pattern, target) {
      var result = 0;
      var pl = pattern.length();
      for (var i = 0; i < target.length(); i = i + pl) {
        if (!target.substring(i, i + pl)==pattern)
          break;
        result++;
      }
      return result;
    }

};


})(jQuery);