grapesjs.plugins.add('link-editor', function(editor, options) {
  options = options || {};

  editor.Commands.add("open-link-editor", {
    run: function(editor, sender, data) {
      data.component = data.component || editor.getSelected();

      var modalHTML = `
<div>
<div style="float: left; width: 48%;">
<div style="padding-bottom: 10px;">
<div>
<label for="selectedLinkTypeID">Link Type</label>
</div>
<div class="gjs-field gjs-field-select">
<div class="gjs-input-holder">
<select id="selectedLinkTypeID" v-model="selectedLinkTypeID">
<option v-for="linkType in linkTypes" v-if="!linkType.links || linkType.links.length > 0" v-bind:value="linkType.id">{{ linkType.name }}</option>
</select>
</div>
<div class="gjs-sel-arrow"><div class="gjs-d-s-arrow"></div></div>
</div>
</div>
<div style="padding-bottom: 10px;">
<div>
<label for="selectedLink">{{ selectedLinkType.friendlyLinkLabel }}</label>
</div>
<div class="gjs-field gjs-field-select" v-if="selectedLinkType.links">
<div class="gjs-input-holder">
<select class="gjs-field" v-model="selectedLink">
<option v-for="link in links" v-bind:value="link.value">{{ link.label }}</option>
</select>
</div>
<div class="gjs-sel-arrow"><div class="gjs-d-s-arrow"></div></div>
</div>
<div class="gjs-field gjs-field-text" v-if="!selectedLinkType.links">
<div class="gjs-input-holder">
<input type="text" v-model="href" placeholder="Enter custom URL" v-if="selectedLinkTypeID =='custom\'">
<input type="text" v-model="emailAddress" placeholder="Enter email address" v-if="selectedLinkTypeID =='email\'">
</div>
</div>
</div>
<div style="padding-bottom: 10px;" v-if="selectedLinkType.id =='email\'">
<div>
<label>Subject</label>
</div>
<div class="gjs-field gjs-field-text">
<div class="gjs-input-holder">
<input type="text" v-model="emailSubject" placeholder="Enter email subject">
</div>
</div>
</div>
<div style="padding-bottom: 10px;" v-if="selectedLinkType.id =='email\'">
<div>
<label>Body</label>
</div>
<div class="gjs-field gjs-field-text">
<div class="gjs-input-holder">
<input type="text" v-model="emailBody" placeholder="Enter email body content">
</div>
</div>
</div>
</div>
<div style="float: right; width: 48%;">
<div style="padding-bottom: 10px;">
<div>
<label for="linkContent">Link Text</label>
</div>
<div class="gjs-field gjs-field-text">
<div class="gjs-input-holder">
<input type="text" id="linkContent" v-model="content" placeholder="Enter link text content">
</div>
</div>
</div>
<div style="padding-bottom: 10px;">
<div>
<label for="linkTitle">Link Title</label>
</div>
<div class="gjs-field gjs-field-text">
<div class="gjs-input-holder">
<input type="text" v-model="title" placeholder="Enter title (appears as a tooltip on hover)">
</div>
</div>
</div>
</div>
<div style="clear: both; padding-top: 20px;">
<button class="gjs-btn-prim" v-on:click="save">Save</button>
</div>
</div>
`;

      editor.Modal
        .setTitle("Edit Link")
        .setContent("<div id='modalContentContainer'></div>")
        .open();

      new Vue({
        template: modalHTML,
        data: {
          href: data.component.get("attributes").href || "",
          title: data.component.get("attributes").title || "",
          content: (data.component.get("content") || "").trim(), // remove any unexpected whitespace (not sure where it comes from)

          emailAddress: "",
          emailSubject: "",
          emailBody: "",

          linkTypes: [
            { id: "custom", name: "Custom URL", friendlyLinkLabel: "URL" },
            { id: "email", name: "Email Address", friendlyLinkLabel: "Email" }
          ],
          selectedLinkTypeID: "custom",
          selectedLink: ""
        },
        computed: {
          links: function() {
            return this.selectedLinkType.links || [];
          },
          selectedLinkType: function() {
            var self = this;

            var matchingCategories = self.linkTypes.filter(function(linkType) {
              return linkType.id == self.selectedLinkTypeID;
            });

            return matchingCategories.length > 0 ? matchingCategories[0] : {};
          }
        },
        watch: {
          selectedLink: function() {
            this.href = this.selectedLink;
          }
        },
        methods: {
          save: function() {
            var attributes = data.component.get("attributes");
            attributes.href = this.getHref();
            attributes.title = this.title;

            data.component.set("attributes", attributes);
            data.component.set("content", this.content);

            // render the view so that the dom element does not have any outdated attributes
            data.component.view.render();

            editor.Modal.close();
          },
          getHref: function() {
            var href = this.href;

            if (this.selectedLinkTypeID == "email") {
              var queryStringParts = [];
              if (this.emailSubject.length > 0) {
                queryStringParts.push("subject=" + encodeURIComponent(this.emailSubject));
              };
              if (this.emailBody.length > 0) {
                queryStringParts.push("body=" + encodeURIComponent(this.emailBody));
              };
              href = "mailto:" + this.emailAddress + "?" + queryStringParts.join("&");
            };

            return href;
          }
        },
        mounted: function() {
          var self = this;

          console.log(options);
          options.links && options.links.forEach(function(linkGroup) {
            self.linkTypes.push({
              id: linkGroup.category,
              name: linkGroup.category,
              friendlyLinkLabel: linkGroup.category,
              links: linkGroup.links
            });
          });

          if (self.href.toLowerCase().indexOf("mailto:") == 0 && self.href.indexOf("?") > 0) {
            self.selectedLinkTypeID = "email";

            self.emailAddress = self.href.split("?")[0].replace("mailto:", "");

            self.href.split("?")[1].split("&")
              .map(function(queryStringParam) {
              return queryStringParam.split("=");
            })
              .forEach(function(queryStringParam) {
              if (queryStringParam[0] == "subject" && queryStringParam.length > 0) {
                self.emailSubject = decodeURIComponent(queryStringParam[1]);
              };
              if (queryStringParam[0] == "body" && queryStringParam.length > 0) {
                self.emailBody = decodeURIComponent(queryStringParam[1]);
              };
            });
          } else {
            self.linkTypes.forEach(function(linkType) {
              (linkType.links || []).forEach(function(link) {
                if (link.value == self.href) {
                  self.selectedLinkTypeID = linkType.id;
                  self.selectedLink = link.value;
                };
              });
            });
          };
        }
      }).$mount("#modalContentContainer");
    }
  });

  // open link modal when double clicking a link component
  var linkType = editor.DomComponents.getType('link');
  editor.DomComponents.addType('link', {
    model: linkType.model,
    view: linkType.view.extend({
      events: {
        "dblclick": "editLink"
      },
      editLink: function(e) {
        e.stopImmediatePropagation(); // prevent the RTE from opening

        editor.runCommand("open-link-editor", {
          component: this.model
        });
      }
    })
  });

  // open link editor when adding link from RTE
  var linkRTEAction = editor.RichTextEditor.remove("link");
  linkRTEAction.result = function(rte) {
    // insert the link with a specific href value so we can find it later
    rte.exec("createLink", "__new__");

    editor.getSelected().view.disableEditing();

    // find the newly created link
    var linkComponents = getAllComponents().filter(function(component) {
      return (component.get("attributes").href || "") == "__new__";
    });
    if (linkComponents.length > 0) {
      var linkComponent = linkComponents[0]; // ideally there should only be 1 that matched the filter

      // remove the placeholder href value
      var attributes = linkComponent.get("attributes");
      attributes.href = "";
      linkComponent.set("attributes", attributes);

      editor.runCommand("open-link-editor", {
        component: linkComponent
      });
    } else {
      console.error("could not find inserted link");
    };
  };

  editor.RichTextEditor.add("link", linkRTEAction);

  function getAllComponents(component) {
    component = component || editor.DomComponents.getWrapper();

    var components = component.get("components").models;
    component.get("components").forEach(function(component) {
      components = components.concat(getAllComponents(component));
    });

    return components;
  };

});


var editor = grapesjs.init({
	container: "#gjs",
  storageManager: {
  	type: ""
  },
  fromElement: true,
  plugins: ['link-editor'],
  pluginsOpts: {
    'link-editor': {
      links: [
        {
          category: "Search Engines",
          links: [
            { value: "http://facebook.com", label: "Google" },
            { value: "http://bing.com", label: "Bing" }
          ]
        }
      ]
    }
  }
})

