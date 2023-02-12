//@ts-check


/* Nav item stuff */

class PositionMarkerReel {

    constructor(element) {

        this.element = element;
        this.markers = Array.from(element.getElementsByClassName("nav-item")).map(
            e => new PositionMarker(e)
        ).reduce((previousObject, nextMarker) => {
            return { ...previousObject, [nextMarker.targetId]: nextMarker }
        }, {});
        this.activeMarker = null;

    }

    recalculate(){
        for(let id in this.markers){
            this.markers[id].recalculate();
        }
    }

    setActive(targetId) {

        if (!(targetId in this.markers)) {
            console.error(`Target ${targetId} not found in markers.`);
            return;
        }

        this.deactivate();
        this.markers[targetId].activate();
        this.activeMarker = targetId;

    }

    deactivate() {
        if (this.activeMarker !== null) {
            this.markers[this.activeMarker].deactivate();
        }
    }

}

let navBarHeight = 0;

class PositionMarker {

    constructor(element) {

        this.element = element;
        this.targetId = this.findTarget(element);
        let targetTopRelative = document.getElementById(this.targetId)?.getBoundingClientRect().top;
        this.recalculate();
        this.addClickListener();
    }

    recalculate(){
        let targetTopRelative = document.getElementById(this.targetId)?.getBoundingClientRect().top;
        if(targetTopRelative === undefined){ Error("Could not find top of section."); return }
        this.targetTop = targetTopRelative + window.scrollY;
    }

    addClickListener() {
        this.element.addEventListener(
            'click', e => {
                if(this.targetTop === undefined){ return; }
                console.log('Clicked');
                e.preventDefault();
                window.scrollTo(0, this.targetTop - navBarHeight);
            }
        )
    }

    findTarget(element) {

        const aTags = element.getElementsByTagName("a");
        if (aTags.length != 1) {
            console.error("Did not find one child A", element);
            return;
        }
        const targetLink = aTags[0];
        const targetId = targetLink.href.split("#")[1];
        return targetId;

    }

    activate() {

        this.element.classList.add("active");

    }

    deactivate() {

        this.element.classList.remove("active");

    }

}

/* Fun with the spacer lines */

function hexToRGB(hexString) {

    const intValue = parseInt(hexString.slice(1), 16);
    return [
        (intValue >> 16) & 255,
        (intValue >> 8) & 255,
        intValue & 255
    ];
}

function RGBToHex(rgbArray) {
    return "#" + rgbArray.map(e => e.toString(16)).join("");
}

const colourScheme = [
    '#3a86ff',
    '#8338ec',
    '#ff006e',
    '#fb5607',
    '#fca311',
    '#FF6058',
    '#58CDFF',
    '#58FFCA',
    '#FDC065'
];

class ColourChangingSpacer {

    constructor(element, numColours) {
        
        this.element = element;
        this.recalculate();

        this.numColours = numColours || 2;
        if(this.numColours > colourScheme.length){
            throw Error("Want more colours than available!");
        }
        this.colours = this.pickRandomColours(this.numColours);
        
        if(DEBUG){ console.log("Spacer", this.colours); }
        this.update(window.scrollY);
    }

    recalculate() {
        this.top = this.element.getBoundingClientRect().top + window.scrollY;
    }

    pickRandomColours(numColours) {

        const coloursCopy = colourScheme.slice();
        const chosenColours = [];
        for(let i = 0; i < numColours; i++){
            let index = Math.floor(Math.random() * coloursCopy.length);
            let colourHex = coloursCopy.splice(index, 1)[0];
            chosenColours.push(hexToRGB(colourHex));
        }
        return chosenColours;
    }

    colourBlend(ratio) {

        if(ratio == 0){
            return RGBToHex(this.colours[0]);
        }
        if(ratio == 1){
            return RGBToHex(this.colours[-1]);
        }

        let lowerIndex = Math.floor((this.numColours - 1) * ratio);
        let distanceBetween = ((this.numColours - 1) * ratio) % 1;

        const newColourRGB = this.colours[lowerIndex].map((v, i) => {
            return Math.round((1 - distanceBetween) * v + distanceBetween * this.colours[lowerIndex + 1][i]);
        }); 

        return RGBToHex(newColourRGB);
    }

    update(scrollPosition) {
        let yRelative = (this.top - scrollPosition) / window.innerHeight;
        if(DEBUG) { console.log("Spacer position:", yRelative); }
        if (yRelative < 0 || yRelative > 1) { return; }
        let newColour = this.colourBlend(yRelative);
        this.element.style.stroke = newColour;
    }

}

/* Debug helpers */

const DEBUG = false;

function addMarker(top, left) {
    const markerDiv = document.createElement("div");
    markerDiv.classList.add("marker");
    markerDiv.style.position = "absolute";
    markerDiv.style.top = top.toString() + "px";
    markerDiv.style.left = left.toString() + "px";
    document.body.appendChild(markerDiv);
}


function main() {

    navBarHeight = document.getElementById("navigation")?.getBoundingClientRect().height || 64;

    const navReel = new PositionMarkerReel(document.getElementById("navigation"));
    const sectionElements = Array.from(document.getElementsByTagName("section"));

    let sectionTops = sectionElements.map(e => {
        let rect = e.getBoundingClientRect();
        let absoluteTop = rect.top + window.scrollY;
        if (DEBUG) { addMarker(absoluteTop, rect.left) }
        return { id: e.id, top: absoluteTop }
    });

    sectionTops.sort((a, b) => a.top - b.top);

    const spacers = Array.from(document.getElementsByClassName("spacer-line")).map(
        e => new ColourChangingSpacer(e, 4)
    );

    document.addEventListener("scroll", e => {

        const actionStack = [];

        const windowPosition = window.scrollY;
        const windowPositionHeadings = windowPosition + window.innerHeight / 5;

        if (DEBUG) { console.log(windowPosition); }
        // Calculate which element is within the 'header' region.
        for (let i = 0; i < sectionTops.length; i++) {
            let itemUnderTest = sectionTops[i];

            if (i == 0 && itemUnderTest.top > windowPositionHeadings) {
                if (DEBUG) { console.log("Deactivating"); }
                actionStack.push(() => navReel.deactivate());
                break;
            }
            else if (i == sectionTops.length - 1) {
                // Last element, must be this one.
                if (DEBUG) { console.log("Activating: ", itemUnderTest.id); }
                actionStack.push(() => navReel.setActive(itemUnderTest.id));
                break;
            } else {
                // Not last element, need to check whether scroll is within it
                let nextItem = sectionTops[i + 1];
                if ((windowPositionHeadings >= itemUnderTest.top) && (windowPositionHeadings <= nextItem.top)) {
                    if (DEBUG) { console.log("Activating: ", itemUnderTest.id); }
                    actionStack.push(() => navReel.setActive(itemUnderTest.id));
                    break;
                }
            }
        }

        for(let spacer of spacers){
            actionStack.push(
                () => spacer.update(windowPosition)
            )
        }

        // Call any actions in the stack at the next frame
        window.requestAnimationFrame(() => actionStack.map(e => e.call()))

    });

    window.addEventListener("resize", e => {
        navBarHeight = document.getElementById("navigation")?.getBoundingClientRect().height || 64;
        navReel.recalculate();
        spacers.map(s => s.recalculate());
        sectionTops = sectionElements.map(e => {
            let rect = e.getBoundingClientRect();
            let absoluteTop = rect.top + window.scrollY;
            if (DEBUG) { addMarker(absoluteTop, rect.left) }
            return { id: e.id, top: absoluteTop }
        });    
    })

};

if (document.readyState == "complete") {
    main()
} else {
    window.addEventListener("load", main);
};