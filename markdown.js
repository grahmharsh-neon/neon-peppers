function escapeMarkdownHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(markdown){
  const source = String(markdown || "").replace(/\r\n?/g, "\n").trim();

  if(!source){
    return "";
  }

  const lines = source.split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;

  const inline = value => {
    let text = escapeMarkdownHtml(value);

    text = text.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );

    text = text.replace(
      /__(.+?)__/g,
      "<strong>$1</strong>"
    );

    text = text.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

    text = text.replace(
      /\*([^*\n]+)\*/g,
      "<em>$1</em>"
    );

    return text;
  };

  const flushParagraph = () => {
    if(!paragraph.length){
      return;
    }

    output.push(
      `<p>${inline(paragraph.join(" "))}</p>`
    );

    paragraph = [];
  };

  const closeList = () => {
    if(!listType){
      return;
    }

    output.push(
      listType === "ul" ? "</ul>" : "</ol>"
    );

    listType = null;
  };

  lines.forEach(rawLine => {
    const line = rawLine.trim();

    if(!line){
      flushParagraph();
      closeList();
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);

    if(heading){
      flushParagraph();
      closeList();

      const level = Math.min(4, heading[1].length + 1);

      output.push(
        `<h${level}>${inline(heading[2])}</h${level}>`
      );

      return;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);

    if(unordered){
      flushParagraph();

      if(listType !== "ul"){
        closeList();
        output.push("<ul>");
        listType = "ul";
      }

      output.push(
        `<li>${inline(unordered[1])}</li>`
      );

      return;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);

    if(ordered){
      flushParagraph();

      if(listType !== "ol"){
        closeList();
        output.push("<ol>");
        listType = "ol";
      }

      output.push(
        `<li>${inline(ordered[1])}</li>`
      );

      return;
    }

    if(/^---+$/.test(line)){
      flushParagraph();
      closeList();
      output.push("<hr>");
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  closeList();

  return output.join("");
}

window.renderMarkdown = renderMarkdown;
