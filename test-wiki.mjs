async function testWikiImage(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=1000&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Data for", query);
  const pages = data.query?.pages;
  if (pages) {
    const pageId = Object.keys(pages)[0];
    console.log("Image URL:", pages[pageId].thumbnail?.source);
  } else {
    console.log("No image found");
  }
}

testWikiImage("Tokyo, Japan");
testWikiImage("Paris, France");
testWikiImage("India");
testWikiImage("Swaminarayan Akshardham Temple");
