"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SKIN_TONES = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];

const EMOJI_DATA: Record<string, { emoji: string; name: string; keywords: string[]; skinTone?: boolean }[]> = {
  "Frequent": [],
  "Smileys": [
    { emoji: "😀", name: "Grinning", keywords: ["grin", "face", "happy"] },
    { emoji: "😃", name: "Grinning with Big Eyes", keywords: ["happy", "face", "smile"] },
    { emoji: "😄", name: "Grinning with Smiling Eyes", keywords: ["happy", "smile", "face"] },
    { emoji: "😁", name: "Beaming", keywords: ["grin", "smile", "happy"] },
    { emoji: "😆", name: "Grinning Squinting", keywords: ["laugh", "happy", "face"] },
    { emoji: "😅", name: "Grinning with Sweat", keywords: ["sweat", "nervous", "happy"] },
    { emoji: "🤣", name: "Rolling on Floor Laughing", keywords: ["laugh", "rofl", "funny"] },
    { emoji: "😂", name: "Face with Tears of Joy", keywords: ["laugh", "cry", "tears", "funny"] },
    { emoji: "🙂", name: "Slightly Smiling", keywords: ["smile", "face"] },
    { emoji: "🙃", name: "Upside Down", keywords: ["upside", "down", "sarcastic"] },
    { emoji: "🫠", name: "Melting", keywords: ["melt", "hot"] },
    { emoji: "😉", name: "Winking", keywords: ["wink", "flirt"] },
    { emoji: "😊", name: "Smiling with Heart Eyes", keywords: ["blush", "smile", "happy"] },
    { emoji: "😇", name: "Smiling with Halo", keywords: ["angel", "innocent"] },
    { emoji: "🥰", name: "Smiling with Hearts", keywords: ["love", "heart", "happy"] },
    { emoji: "😍", name: "Heart Eyes", keywords: ["love", "heart", "crush"] },
    { emoji: "🤩", name: "Star Struck", keywords: ["star", "excited", "amazed"] },
    { emoji: "😘", name: "Face Blowing a Kiss", keywords: ["kiss", "love"] },
    { emoji: "😗", name: "Kissing", keywords: ["kiss", "face"] },
    { emoji: "☺️", name: "Smiling", keywords: ["smile", "happy"] },
    { emoji: "😚", name: "Kissing with Closed Eyes", keywords: ["kiss", "love"] },
    { emoji: "😙", name: "Kissing with Smiling Eyes", keywords: ["kiss", "smile"] },
    { emoji: "🥲", name: "Smiling through Tears", keywords: ["cry", "happy", "tear"] },
    { emoji: "😋", name: "Face Savoring Food", keywords: ["yum", "food", "tongue"] },
    { emoji: "😛", name: "Face with Tongue", keywords: ["tongue", "silly"] },
    { emoji: "😜", name: "Winking with Tongue", keywords: ["tongue", "silly", "wink"] },
    { emoji: "🤪", name: "Zany", keywords: ["crazy", "silly", "wacky"] },
    { emoji: "😝", name: "Squinting with Tongue", keywords: ["tongue", "silly"] },
    { emoji: "🤑", name: "Money Mouth", keywords: ["money", "rich"] },
    { emoji: "🤗", name: "Hugging", keywords: ["hug", "cuddle"] },
    { emoji: "🤭", name: "Hand Over Mouth", keywords: ["oops", "shy", "giggle"] },
    { emoji: "🫢", name: "Face with Open Eyes & Hand Over Mouth", keywords: ["shock", "surprise"] },
    { emoji: "🫣", name: "Face with Peeking Eye", keywords: ["peek", "shy"] },
    { emoji: "🤫", name: "Shushing", keywords: ["shush", "quiet", "secret"] },
    { emoji: "🤔", name: "Thinking", keywords: ["think", "consider", "hmm"] },
    { emoji: "🫡", name: "Saluting", keywords: ["salute", "respect"] },
    { emoji: "🤐", name: "Zipper Mouth", keywords: ["quiet", "secret"] },
    { emoji: "🤨", name: "Raised Eyebrow", keywords: ["skeptic", "doubt"] },
    { emoji: "😐", name: "Neutral", keywords: ["neutral", "meh"] },
    { emoji: "😑", name: "Expressionless", keywords: ["blank", "straight"] },
    { emoji: "😶", name: "Without Mouth", keywords: ["quiet", "silent"] },
    { emoji: "🫥", name: "Dotted Line", keywords: ["invisible", "hidden"] },
    { emoji: "😏", name: "Smirking", keywords: ["smirk", "smug"] },
    { emoji: "😒", name: "Unamused", keywords: ["roll", "eyes", "annoyed"] },
    { emoji: "🙄", name: "Face with Rolling Eyes", keywords: ["roll", "eyes", "annoyed"] },
    { emoji: "😬", name: "Grimacing", keywords: ["awkward", "nervous"] },
    { emoji: "😮‍💨", name: "Face Exhaling", keywords: ["sigh", "relief"] },
    { emoji: "🤥", name: "Lying", keywords: ["pinocchio", "lie"] },
    { emoji: "😌", name: "Relieved", keywords: ["relieved", "calm"] },
    { emoji: "😔", name: "Pensive", keywords: ["sad", "thinking", "down"] },
    { emoji: "😪", name: "Sleepy", keywords: ["sleepy", "tired"] },
    { emoji: "🤤", name: "Drooling", keywords: ["drool", "hungry"] },
    { emoji: "😴", name: "Sleeping", keywords: ["sleep", "zzz"] },
    { emoji: "😷", name: "Face with Mask", keywords: ["mask", "sick", "hospital"] },
    { emoji: "🤒", name: "Thermometer", keywords: ["sick", "fever"] },
    { emoji: "🤕", name: "Head Bandage", keywords: ["hurt", "injury"] },
    { emoji: "🤢", name: "Nauseated", keywords: ["sick", "vomit", "gross"] },
    { emoji: "🤮", name: "Vomiting", keywords: ["sick", "vomit"] },
    { emoji: "🤧", name: "Sneezing", keywords: ["sneeze", "sick", "cold"] },
    { emoji: "🥵", name: "Hot Face", keywords: ["hot", "sweat", "heat"] },
    { emoji: "🥶", name: "Cold Face", keywords: ["cold", "freeze", "ice"] },
    { emoji: "🥴", name: "Woozy", keywords: ["drunk", "dizzy"] },
    { emoji: "😵", name: "Dizzy", keywords: ["dizzy", "spiral"] },
    { emoji: "😵‍💫", name: "Dizzy with Spiral Eyes", keywords: ["dizzy", "confused"] },
    { emoji: "🤯", name: "Exploding Head", keywords: ["mind", "blown", "shock"] },
    { emoji: "🤠", name: "Cowboy", keywords: ["cowboy", "western"] },
    { emoji: "🥳", name: "Partying", keywords: ["party", "celebrate"] },
    { emoji: "🥸", name: "Disguised", keywords: ["disguise", "mask"] },
    { emoji: "😎", name: "Smiling with Sunglasses", keywords: ["cool", "sunglasses"] },
    { emoji: "🤓", name: "Nerd", keywords: ["nerd", "glasses"] },
    { emoji: "🧐", name: "Face with Monocle", keywords: ["monocle", "fancy"] },
    { emoji: "😕", name: "Confused", keywords: ["confused", "unsure"] },
    { emoji: "🫤", name: "Face with Diagonal Mouth", keywords: ["confused", "unsure"] },
    { emoji: "😟", name: "Worried", keywords: ["worry", "nervous"] },
    { emoji: "🙁", name: "Slightly Frowning", keywords: ["frown", "sad"] },
    { emoji: "😮", name: "Face with Open Mouth", keywords: ["surprise", "shock", "wow"] },
    { emoji: "😯", name: "Hushed", keywords: ["surprise", "quiet"] },
    { emoji: "😲", name: "Astonished", keywords: ["shock", "surprise", "wow"] },
    { emoji: "😳", name: "Flushed", keywords: ["embarrass", "blush"] },
    { emoji: "🥺", name: "Pleading", keywords: ["plead", "puppy", "beg"] },
    { emoji: "🥹", name: "Face Holding Back Tears", keywords: ["cry", "tear", "emotional"] },
    { emoji: "😢", name: "Crying", keywords: ["cry", "tear", "sad"] },
    { emoji: "😭", name: "Loudly Crying", keywords: ["cry", "tear", "sob"] },
    { emoji: "😤", name: "Steaming", keywords: ["angry", "frustrated"] },
    { emoji: "😠", name: "Angry", keywords: ["angry", "mad"] },
    { emoji: "😡", name: "Pouting", keywords: ["angry", "rage", "red"] },
    { emoji: "🤬", name: "Face with Symbols", keywords: ["curse", "swear", "angry"] },
    { emoji: "💀", name: "Skull", keywords: ["death", "dead", "skeleton"] },
    { emoji: "☠️", name: "Skull and Crossbones", keywords: ["death", "danger"] },
    { emoji: "💩", name: "Pile of Poo", keywords: ["poop", "shit", "funny"] },
    { emoji: "🤡", name: "Clown", keywords: ["clown", "circus"] },
    { emoji: "👹", name: "Ogre", keywords: ["monster", "devil"] },
    { emoji: "👺", name: "Goblin", keywords: ["monster", "devil"] },
    { emoji: "👻", name: "Ghost", keywords: ["ghost", "spooky"] },
    { emoji: "👽", name: "Alien", keywords: ["alien", "ufo"] },
    { emoji: "👾", name: "Space Invader", keywords: ["alien", "game"] },
    { emoji: "🤖", name: "Robot", keywords: ["robot", "ai"] },
    { emoji: "😺", name: "Grinning Cat", keywords: ["cat", "happy"] },
    { emoji: "😸", name: "Grinning Cat with Eyes", keywords: ["cat", "smile"] },
    { emoji: "😹", name: "Cat with Tears of Joy", keywords: ["cat", "laugh"] },
    { emoji: "😻", name: "Heart Eyes Cat", keywords: ["cat", "love"] },
    { emoji: "😼", name: "Wry Smile Cat", keywords: ["cat", "smirk"] },
    { emoji: "😽", name: "Kissing Cat", keywords: ["cat", "kiss"] },
    { emoji: "🙀", name: "Weary Cat", keywords: ["cat", "shock"] },
    { emoji: "😿", name: "Crying Cat", keywords: ["cat", "tear"] },
    { emoji: "😾", name: "Pouting Cat", keywords: ["cat", "angry"] },
    { emoji: "🙈", name: "See-No-Evil Monkey", keywords: ["monkey", "shy"] },
    { emoji: "🙉", name: "Hear-No-Evil Monkey", keywords: ["monkey", "deaf"] },
    { emoji: "🙊", name: "Speak-No-Evil Monkey", keywords: ["monkey", "mute"] },
  ],
  "Gestures": [
    { emoji: "👋", name: "Waving Hand", keywords: ["wave", "hello", "bye"], skinTone: true },
    { emoji: "🤚", name: "Raised Back of Hand", keywords: ["hand", "stop"], skinTone: true },
    { emoji: "🖐️", name: "Hand with Fingers Splayed", keywords: ["hand", "stop"], skinTone: true },
    { emoji: "✋", name: "Raised Hand", keywords: ["hand", "stop", "highfive"], skinTone: true },
    { emoji: "🖖", name: "Vulcan Salute", keywords: ["spock", "star trek"], skinTone: true },
    { emoji: "🫱", name: "Rightwards Hand", keywords: ["hand", "right"], skinTone: true },
    { emoji: "🫲", name: "Leftwards Hand", keywords: ["hand", "left"], skinTone: true },
    { emoji: "🫳", name: "Palm Down Hand", keywords: ["hand", "down"], skinTone: true },
    { emoji: "🫴", name: "Palm Up Hand", keywords: ["hand", "up"], skinTone: true },
    { emoji: "👌", name: "OK Hand", keywords: ["ok", "fine"], skinTone: true },
    { emoji: "🤌", name: "Pinched Fingers", keywords: ["italian", "gesture"], skinTone: true },
    { emoji: "🤏", name: "Pinching Hand", keywords: ["small", "tiny"], skinTone: true },
    { emoji: "✌️", name: "Victory Hand", keywords: ["peace", "victory", "v"], skinTone: true },
    { emoji: "🤞", name: "Crossed Fingers", keywords: ["hope", "luck", "cross"], skinTone: true },
    { emoji: "🫰", name: "Hand with Index Finger & Thumb Crossed", keywords: ["love", "heart"], skinTone: true },
    { emoji: "🤟", name: "Love-You Gesture", keywords: ["love", "ily"], skinTone: true },
    { emoji: "🤘", name: "Sign of the Horns", keywords: ["rock", "horns", "metal"], skinTone: true },
    { emoji: "🤙", name: "Call Me Hand", keywords: ["call", "phone", "hang"], skinTone: true },
    { emoji: "👈", name: "Backhand Index Pointing Left", keywords: ["point", "left"], skinTone: true },
    { emoji: "👉", name: "Backhand Index Pointing Right", keywords: ["point", "right"], skinTone: true },
    { emoji: "👆", name: "Backhand Index Pointing Up", keywords: ["point", "up"], skinTone: true },
    { emoji: "🖕", name: "Middle Finger", keywords: ["fuck", "middle"], skinTone: true },
    { emoji: "👇", name: "Backhand Index Pointing Down", keywords: ["point", "down"], skinTone: true },
    { emoji: "☝️", name: "Index Pointing Up", keywords: ["point", "up"], skinTone: true },
    { emoji: "🫵", name: "Index Pointing at the Viewer", keywords: ["you", "point"], skinTone: true },
    { emoji: "👍", name: "Thumbs Up", keywords: ["thumbs", "up", "like", "good"], skinTone: true },
    { emoji: "👎", name: "Thumbs Down", keywords: ["thumbs", "down", "dislike"], skinTone: true },
    { emoji: "✊", name: "Raised Fist", keywords: ["fist", "power"], skinTone: true },
    { emoji: "👊", name: "Oncoming Fist", keywords: ["fist", "bump", "punch"], skinTone: true },
    { emoji: "🤛", name: "Left-Facing Fist", keywords: ["fist", "left"], skinTone: true },
    { emoji: "🤜", name: "Right-Facing Fist", keywords: ["fist", "right"], skinTone: true },
    { emoji: "👏", name: "Clapping Hands", keywords: ["clap", "applause"], skinTone: true },
    { emoji: "🙌", name: "Raising Hands", keywords: ["raise", "celebrate"], skinTone: true },
    { emoji: "🫶", name: "Heart Hands", keywords: ["heart", "love"], skinTone: true },
    { emoji: "👐", name: "Open Hands", keywords: ["open", "hug"], skinTone: true },
    { emoji: "🤲", name: "Palms Up Together", keywords: ["dua", "pray"], skinTone: true },
    { emoji: "🤝", name: "Handshake", keywords: ["shake", "deal"] },
    { emoji: "🙏", name: "Folded Hands", keywords: ["pray", "please", "thanks"], skinTone: true },
    { emoji: "✍️", name: "Writing Hand", keywords: ["write", "pen"], skinTone: true },
    { emoji: "💅", name: "Nail Polish", keywords: ["nails", "cute", "fashion"], skinTone: true },
    { emoji: "🤳", name: "Selfie", keywords: ["selfie", "phone"], skinTone: true },
    { emoji: "💪", name: "Flexed Biceps", keywords: ["muscle", "strong", "arm"], skinTone: true },
    { emoji: "🦵", name: "Leg", keywords: ["leg", "kick"], skinTone: true },
    { emoji: "🦶", name: "Foot", keywords: ["foot"], skinTone: true },
    { emoji: "👂", name: "Ear", keywords: ["ear", "hear"], skinTone: true },
    { emoji: "👃", name: "Nose", keywords: ["nose", "smell"], skinTone: true },
    { emoji: "🧠", name: "Brain", keywords: ["brain", "smart"] },
    { emoji: "🫀", name: "Anatomical Heart", keywords: ["heart", "anatomy"] },
    { emoji: "🫁", name: "Lungs", keywords: ["lungs", "breathe"] },
    { emoji: "👀", name: "Eyes", keywords: ["eyes", "look"] },
    { emoji: "👁️", name: "Eye", keywords: ["eye", "look"] },
    { emoji: "👅", name: "Tongue", keywords: ["tongue"] },
    { emoji: "👄", name: "Mouth", keywords: ["mouth", "lips"] },
    { emoji: "🦷", name: "Tooth", keywords: ["tooth"] },
    { emoji: "🦴", name: "Bone", keywords: ["bone"] },
  ],
  "People": [
    { emoji: "👶", name: "Baby", keywords: ["baby", "child"], skinTone: true },
    { emoji: "🧒", name: "Child", keywords: ["child", "kid"], skinTone: true },
    { emoji: "👦", name: "Boy", keywords: ["boy", "child"], skinTone: true },
    { emoji: "👧", name: "Girl", keywords: ["girl", "child"], skinTone: true },
    { emoji: "🧑", name: "Person", keywords: ["person", "adult"], skinTone: true },
    { emoji: "👱", name: "Person Blond Hair", keywords: ["blond", "hair"], skinTone: true },
    { emoji: "👨", name: "Man", keywords: ["man", "male"], skinTone: true },
    { emoji: "🧔", name: "Bearded Person", keywords: ["beard", "man"], skinTone: true },
    { emoji: "👩", name: "Woman", keywords: ["woman", "female"], skinTone: true },
    { emoji: "🧓", name: "Older Person", keywords: ["elder", "old"], skinTone: true },
    { emoji: "👴", name: "Old Man", keywords: ["grandpa", "old"], skinTone: true },
    { emoji: "👵", name: "Old Woman", keywords: ["grandma", "old"], skinTone: true },
    { emoji: "🙍", name: "Person Frowning", keywords: ["frown", "unhappy"], skinTone: true },
    { emoji: "🙎", name: "Person Pouting", keywords: ["pout", "angry"], skinTone: true },
    { emoji: "🙅", name: "Person Gesturing No", keywords: ["no", "deny", "stop"], skinTone: true },
    { emoji: "🙆", name: "Person Gesturing OK", keywords: ["ok", "fine"], skinTone: true },
    { emoji: "💁", name: "Person Tipping Hand", keywords: ["info", "help"], skinTone: true },
    { emoji: "🙋", name: "Person Raising Hand", keywords: ["raise", "question"], skinTone: true },
    { emoji: "🧏", name: "Deaf Person", keywords: ["deaf", "hearing"], skinTone: true },
    { emoji: "🙇", name: "Person Bowing", keywords: ["bow", "apology"], skinTone: true },
    { emoji: "🤦", name: "Face Palm", keywords: ["facepalm", "frustrated"], skinTone: true },
    { emoji: "🤷", name: "Person Shrugging", keywords: ["shrug", "dunno"], skinTone: true },
    { emoji: "👕", name: "T-Shirt", keywords: ["shirt", "clothing"] },
    { emoji: "👖", name: "Jeans", keywords: ["pants", "denim"] },
    { emoji: "🧣", name: "Scarf", keywords: ["scarf", "winter"] },
    { emoji: "🧤", name: "Gloves", keywords: ["gloves", "hands"] },
    { emoji: "🧥", name: "Coat", keywords: ["coat", "jacket"] },
    { emoji: "🧦", name: "Socks", keywords: ["socks"] },
    { emoji: "👗", name: "Dress", keywords: ["dress"] },
    { emoji: "👘", name: "Kimono", keywords: ["kimono"] },
    { emoji: "🥻", name: "Sari", keywords: ["sari"] },
    { emoji: "🩱", name: "One-Piece Swimsuit", keywords: ["swimsuit", "bathing"] },
    { emoji: "🩲", name: "Briefs", keywords: ["underwear"] },
    { emoji: "🩳", name: "Shorts", keywords: ["shorts"] },
    { emoji: "👙", name: "Bikini", keywords: ["bikini", "beach"] },
    { emoji: "👚", name: "Women's Clothes", keywords: ["clothes", "woman"] },
    { emoji: "👛", name: "Purse", keywords: ["purse"] },
    { emoji: "👜", name: "Handbag", keywords: ["bag", "handbag"] },
    { emoji: "👝", name: "Clutch Bag", keywords: ["bag", "clutch"] },
    { emoji: "🎒", name: "Backpack", keywords: ["backpack", "bag", "school"] },
    { emoji: "👞", name: "Man's Shoe", keywords: ["shoe"] },
    { emoji: "👟", name: "Running Shoe", keywords: ["sneaker", "shoe"] },
    { emoji: "🥾", name: "Hiking Boot", keywords: ["boot", "hiking"] },
    { emoji: "🥿", name: "Flat Shoe", keywords: ["shoe", "flat"] },
    { emoji: "👠", name: "High Heel", keywords: ["heel", "shoe"] },
    { emoji: "👡", name: "Sandal", keywords: ["sandal", "shoe"] },
    { emoji: "👢", name: "Boot", keywords: ["boot"] },
    { emoji: "👑", name: "Crown", keywords: ["king", "queen", "royal"] },
    { emoji: "👒", name: "Hat", keywords: ["hat"] },
    { emoji: "🎩", name: "Top Hat", keywords: ["top hat", "magic"] },
    { emoji: "🎓", name: "Graduation Cap", keywords: ["graduate", "school"] },
    { emoji: "🧢", name: "Billed Cap", keywords: ["cap"] },
    { emoji: "🪖", name: "Military Helmet", keywords: ["helmet", "army"] },
    { emoji: "⛑️", name: "Rescue Worker Helmet", keywords: ["helmet", "rescue"] },
    { emoji: "💄", name: "Lipstick", keywords: ["makeup", "cosmetics"] },
    { emoji: "💍", name: "Ring", keywords: ["ring", "diamond"] },
    { emoji: "💼", name: "Briefcase", keywords: ["briefcase", "work"] },
  ],
  "Animals": [
    { emoji: "🐶", name: "Dog Face", keywords: ["dog", "puppy"] },
    { emoji: "🐱", name: "Cat Face", keywords: ["cat", "kitty"] },
    { emoji: "🐭", name: "Mouse Face", keywords: ["mouse"] },
    { emoji: "🐹", name: "Hamster", keywords: ["hamster"] },
    { emoji: "🐰", name: "Rabbit Face", keywords: ["rabbit", "bunny"] },
    { emoji: "🦊", name: "Fox", keywords: ["fox"] },
    { emoji: "🐻", name: "Bear", keywords: ["bear"] },
    { emoji: "🐼", name: "Panda", keywords: ["panda"] },
    { emoji: "🐻‍❄️", name: "Polar Bear", keywords: ["polar", "bear"] },
    { emoji: "🐨", name: "Koala", keywords: ["koala"] },
    { emoji: "🐯", name: "Tiger Face", keywords: ["tiger"] },
    { emoji: "🦁", name: "Lion", keywords: ["lion"] },
    { emoji: "🐮", name: "Cow Face", keywords: ["cow"] },
    { emoji: "🐷", name: "Pig Face", keywords: ["pig"] },
    { emoji: "🐸", name: "Frog", keywords: ["frog"] },
    { emoji: "🐵", name: "Monkey Face", keywords: ["monkey"] },
    { emoji: "🐔", name: "Chicken", keywords: ["chicken"] },
    { emoji: "🐧", name: "Penguin", keywords: ["penguin"] },
    { emoji: "🐦", name: "Bird", keywords: ["bird"] },
    { emoji: "🐤", name: "Baby Chick", keywords: ["chick"] },
    { emoji: "🦅", name: "Eagle", keywords: ["eagle", "bird"] },
    { emoji: "🦆", name: "Duck", keywords: ["duck"] },
    { emoji: "🦉", name: "Owl", keywords: ["owl"] },
    { emoji: "🦇", name: "Bat", keywords: ["bat"] },
    { emoji: "🐺", name: "Wolf", keywords: ["wolf"] },
    { emoji: "🐗", name: "Boar", keywords: ["boar"] },
    { emoji: "🐴", name: "Horse Face", keywords: ["horse"] },
    { emoji: "🦄", name: "Unicorn", keywords: ["unicorn"] },
    { emoji: "🐝", name: "Honeybee", keywords: ["bee"] },
    { emoji: "🐛", name: "Bug", keywords: ["bug"] },
    { emoji: "🦋", name: "Butterfly", keywords: ["butterfly"] },
    { emoji: "🐌", name: "Snail", keywords: ["snail"] },
    { emoji: "🐞", name: "Lady Beetle", keywords: ["ladybug"] },
    { emoji: "🐜", name: "Ant", keywords: ["ant"] },
    { emoji: "🦟", name: "Mosquito", keywords: ["mosquito"] },
    { emoji: "🦗", name: "Cricket", keywords: ["cricket"] },
    { emoji: "🪳", name: "Cockroach", keywords: ["cockroach"] },
    { emoji: "🦂", name: "Scorpion", keywords: ["scorpion"] },
    { emoji: "🐢", name: "Turtle", keywords: ["turtle"] },
    { emoji: "🐍", name: "Snake", keywords: ["snake"] },
    { emoji: "🦎", name: "Lizard", keywords: ["lizard"] },
    { emoji: "🦖", name: "T-Rex", keywords: ["dinosaur", "trex"] },
    { emoji: "🦕", name: "Sauropod", keywords: ["dinosaur", "brontosaurus"] },
    { emoji: "🐙", name: "Octopus", keywords: ["octopus"] },
    { emoji: "🦑", name: "Squid", keywords: ["squid"] },
    { emoji: "🦐", name: "Shrimp", keywords: ["shrimp"] },
    { emoji: "🦞", name: "Lobster", keywords: ["lobster"] },
    { emoji: "🦀", name: "Crab", keywords: ["crab"] },
    { emoji: "🐡", name: "Blowfish", keywords: ["fish"] },
    { emoji: "🐠", name: "Tropical Fish", keywords: ["fish"] },
    { emoji: "🐟", name: "Fish", keywords: ["fish"] },
    { emoji: "🐬", name: "Dolphin", keywords: ["dolphin"] },
    { emoji: "🐳", name: "Spouting Whale", keywords: ["whale"] },
    { emoji: "🐋", name: "Whale", keywords: ["whale"] },
    { emoji: "🦈", name: "Shark", keywords: ["shark"] },
    { emoji: "🐊", name: "Crocodile", keywords: ["crocodile"] },
    { emoji: "🐅", name: "Tiger", keywords: ["tiger"] },
    { emoji: "🐆", name: "Leopard", keywords: ["leopard"] },
    { emoji: "🦓", name: "Zebra", keywords: ["zebra"] },
    { emoji: "🦍", name: "Gorilla", keywords: ["gorilla"] },
    { emoji: "🦧", name: "Orangutan", keywords: ["orangutan"] },
    { emoji: "🐘", name: "Elephant", keywords: ["elephant"] },
    { emoji: "🦛", name: "Hippopotamus", keywords: ["hippo"] },
    { emoji: "🦏", name: "Rhinoceros", keywords: ["rhino"] },
    { emoji: "🐪", name: "Camel", keywords: ["camel"] },
    { emoji: "🐫", name: "Two-Hump Camel", keywords: ["camel"] },
    { emoji: "🦒", name: "Giraffe", keywords: ["giraffe"] },
    { emoji: "🦘", name: "Kangaroo", keywords: ["kangaroo"] },
    { emoji: "🦥", name: "Sloth", keywords: ["sloth"] },
    { emoji: "🦦", name: "Otter", keywords: ["otter"] },
    { emoji: "🦨", name: "Skunk", keywords: ["skunk"] },
    { emoji: "🦡", name: "Badger", keywords: ["badger"] },
    { emoji: "🐾", name: "Paw Prints", keywords: ["paw", "prints"] },
  ],
  "Food": [
    { emoji: "🍏", name: "Green Apple", keywords: ["apple", "fruit"] },
    { emoji: "🍎", name: "Red Apple", keywords: ["apple", "fruit"] },
    { emoji: "🍐", name: "Pear", keywords: ["pear", "fruit"] },
    { emoji: "🍊", name: "Tangerine", keywords: ["orange", "fruit"] },
    { emoji: "🍋", name: "Lemon", keywords: ["lemon", "citrus"] },
    { emoji: "🍌", name: "Banana", keywords: ["banana", "fruit"] },
    { emoji: "🍉", name: "Watermelon", keywords: ["watermelon", "fruit"] },
    { emoji: "🍇", name: "Grapes", keywords: ["grape", "fruit"] },
    { emoji: "🍓", name: "Strawberry", keywords: ["strawberry", "fruit"] },
    { emoji: "🫐", name: "Blueberries", keywords: ["blueberry", "fruit"] },
    { emoji: "🍈", name: "Melon", keywords: ["melon", "fruit"] },
    { emoji: "🍒", name: "Cherries", keywords: ["cherry", "fruit"] },
    { emoji: "🍑", name: "Peach", keywords: ["peach"] },
    { emoji: "🥭", name: "Mango", keywords: ["mango", "fruit"] },
    { emoji: "🍍", name: "Pineapple", keywords: ["pineapple", "fruit"] },
    { emoji: "🥥", name: "Coconut", keywords: ["coconut"] },
    { emoji: "🥝", name: "Kiwi", keywords: ["kiwi", "fruit"] },
    { emoji: "🍅", name: "Tomato", keywords: ["tomato"] },
    { emoji: "🥑", name: "Avocado", keywords: ["avocado"] },
    { emoji: "🍆", name: "Eggplant", keywords: ["eggplant"] },
    { emoji: "🥦", name: "Broccoli", keywords: ["broccoli"] },
    { emoji: "🥬", name: "Leafy Green", keywords: ["lettuce", "salad"] },
    { emoji: "🥒", name: "Cucumber", keywords: ["cucumber"] },
    { emoji: "🌶️", name: "Hot Pepper", keywords: ["pepper", "spicy"] },
    { emoji: "🫑", name: "Bell Pepper", keywords: ["pepper"] },
    { emoji: "🌽", name: "Corn", keywords: ["corn"] },
    { emoji: "🥕", name: "Carrot", keywords: ["carrot"] },
    { emoji: "🫒", name: "Olive", keywords: ["olive"] },
    { emoji: "🥔", name: "Potato", keywords: ["potato"] },
    { emoji: "🍠", name: "Sweet Potato", keywords: ["sweet potato"] },
    { emoji: "🥐", name: "Croissant", keywords: ["croissant"] },
    { emoji: "🍞", name: "Bread", keywords: ["bread"] },
    { emoji: "🥖", name: "Baguette", keywords: ["baguette", "bread"] },
    { emoji: "🥨", name: "Pretzel", keywords: ["pretzel"] },
    { emoji: "🧀", name: "Cheese", keywords: ["cheese"] },
    { emoji: "🥚", name: "Egg", keywords: ["egg"] },
    { emoji: "🍳", name: "Cooking", keywords: ["frying", "egg"] },
    { emoji: "🥞", name: "Pancakes", keywords: ["pancake"] },
    { emoji: "🧇", name: "Waffle", keywords: ["waffle"] },
    { emoji: "🥓", name: "Bacon", keywords: ["bacon"] },
    { emoji: "🥩", name: "Cut of Meat", keywords: ["steak", "meat"] },
    { emoji: "🍗", name: "Poultry Leg", keywords: ["chicken", "drumstick"] },
    { emoji: "🍖", name: "Meat on Bone", keywords: ["meat", "rib"] },
    { emoji: "🌭", name: "Hot Dog", keywords: ["hotdog"] },
    { emoji: "🍔", name: "Hamburger", keywords: ["burger", "hamburger"] },
    { emoji: "🍟", name: "French Fries", keywords: ["fries"] },
    { emoji: "🍕", name: "Pizza", keywords: ["pizza"] },
    { emoji: "🥪", name: "Sandwich", keywords: ["sandwich"] },
    { emoji: "🥙", name: "Stuffed Flatbread", keywords: ["wrap", "gyro"] },
    { emoji: "🧆", name: "Falafel", keywords: ["falafel"] },
    { emoji: "🥗", name: "Salad", keywords: ["salad"] },
    { emoji: "🍜", name: "Steaming Bowl", keywords: ["ramen", "noodles"] },
    { emoji: "🍝", name: "Spaghetti", keywords: ["pasta"] },
    { emoji: "🍛", name: "Curry Rice", keywords: ["curry"] },
    { emoji: "🍣", name: "Sushi", keywords: ["sushi"] },
    { emoji: "🍱", name: "Bento Box", keywords: ["bento"] },
    { emoji: "🫔", name: "Tamale", keywords: ["tamale"] },
    { emoji: "🥟", name: "Dumpling", keywords: ["dumpling"] },
    { emoji: "🦪", name: "Oyster", keywords: ["oyster"] },
    { emoji: "🍦", name: "Soft Ice Cream", keywords: ["ice cream"] },
    { emoji: "🍧", name: "Shaved Ice", keywords: ["shaved ice"] },
    { emoji: "🍨", name: "Ice Cream", keywords: ["ice cream"] },
    { emoji: "🍩", name: "Doughnut", keywords: ["donut"] },
    { emoji: "🍪", name: "Cookie", keywords: ["cookie"] },
    { emoji: "🎂", name: "Birthday Cake", keywords: ["cake", "birthday"] },
    { emoji: "🍰", name: "Shortcake", keywords: ["cake"] },
    { emoji: "🧁", name: "Cupcake", keywords: ["cupcake"] },
    { emoji: "🥧", name: "Pie", keywords: ["pie"] },
    { emoji: "🍫", name: "Chocolate", keywords: ["chocolate"] },
    { emoji: "🍬", name: "Candy", keywords: ["candy"] },
    { emoji: "🍭", name: "Lollipop", keywords: ["lollipop"] },
    { emoji: "🍮", name: "Custard", keywords: ["custard", "flan"] },
    { emoji: "🍯", name: "Honey Pot", keywords: ["honey"] },
    { emoji: "☕", name: "Hot Beverage", keywords: ["coffee", "tea"] },
    { emoji: "🫖", name: "Teapot", keywords: ["tea"] },
    { emoji: "🍵", name: "Teacup", keywords: ["tea", "matcha"] },
    { emoji: "🥤", name: "Cup with Straw", keywords: ["soda", "drink"] },
    { emoji: "🧃", name: "Juice Box", keywords: ["juice"] },
    { emoji: "🥛", name: "Glass of Milk", keywords: ["milk"] },
    { emoji: "🍺", name: "Beer", keywords: ["beer"] },
    { emoji: "🍻", name: "Clinking Beers", keywords: ["beer", "cheers"] },
    { emoji: "🥂", name: "Clinking Glasses", keywords: ["champagne", "cheers"] },
    { emoji: "🍷", name: "Wine Glass", keywords: ["wine"] },
    { emoji: "🍸", name: "Cocktail", keywords: ["cocktail"] },
    { emoji: "🍹", name: "Tropical Drink", keywords: ["drink", "tropical"] },
    { emoji: "🧊", name: "Ice", keywords: ["ice", "cube"] },
  ],
  "Travel": [
    { emoji: "🌍", name: "Globe Europe-Africa", keywords: ["globe", "earth", "world"] },
    { emoji: "🌎", name: "Globe Americas", keywords: ["globe", "earth"] },
    { emoji: "🌏", name: "Globe Asia-Australia", keywords: ["globe", "earth"] },
    { emoji: "🗺️", name: "World Map", keywords: ["map"] },
    { emoji: "🏔️", name: "Snow Capped Mountain", keywords: ["mountain"] },
    { emoji: "⛰️", name: "Mountain", keywords: ["mountain"] },
    { emoji: "🌋", name: "Volcano", keywords: ["volcano"] },
    { emoji: "🏖️", name: "Beach", keywords: ["beach", "umbrella"] },
    { emoji: "🏝️", name: "Desert Island", keywords: ["island"] },
    { emoji: "🏜️", name: "Desert", keywords: ["desert"] },
    { emoji: "🌲", name: "Evergreen Tree", keywords: ["tree", "pine"] },
    { emoji: "🌳", name: "Deciduous Tree", keywords: ["tree"] },
    { emoji: "🌴", name: "Palm Tree", keywords: ["palm", "tropical"] },
    { emoji: "🌵", name: "Cactus", keywords: ["cactus"] },
    { emoji: "🌾", name: "Sheaf of Rice", keywords: ["rice", "wheat"] },
    { emoji: "🌿", name: "Herb", keywords: ["herb", "plant"] },
    { emoji: "☘️", name: "Shamrock", keywords: ["shamrock", "clover"] },
    { emoji: "🍀", name: "Four Leaf Clover", keywords: ["clover", "luck"] },
    { emoji: "🍁", name: "Maple Leaf", keywords: ["maple", "canada"] },
    { emoji: "🍂", name: "Fallen Leaf", keywords: ["leaf", "autumn"] },
    { emoji: "🍃", name: "Leaf Fluttering", keywords: ["leaf", "wind"] },
    { emoji: "🌸", name: "Cherry Blossom", keywords: ["flower", "sakura"] },
    { emoji: "💐", name: "Bouquet", keywords: ["flowers", "bouquet"] },
    { emoji: "🌹", name: "Rose", keywords: ["rose", "flower"] },
    { emoji: "🥀", name: "Wilted Flower", keywords: ["flower", "wilted"] },
    { emoji: "🌺", name: "Hibiscus", keywords: ["flower"] },
    { emoji: "🌻", name: "Sunflower", keywords: ["flower", "sun"] },
    { emoji: "🌼", name: "Blossom", keywords: ["flower"] },
    { emoji: "🌷", name: "Tulip", keywords: ["flower"] },
    { emoji: "🌱", name: "Seedling", keywords: ["seed", "sprout"] },
    { emoji: "🪴", name: "Potted Plant", keywords: ["plant", "indoor"] },
    { emoji: "🌞", name: "Sun with Face", keywords: ["sun"] },
    { emoji: "🌝", name: "Full Moon Face", keywords: ["moon"] },
    { emoji: "🌛", name: "First Quarter Moon", keywords: ["moon"] },
    { emoji: "⭐", name: "Star", keywords: ["star"] },
    { emoji: "🌟", name: "Glowing Star", keywords: ["star", "glow"] },
    { emoji: "🌠", name: "Shooting Star", keywords: ["shooting", "star"] },
    { emoji: "☀️", name: "Sun", keywords: ["sun", "weather"] },
    { emoji: "🌤️", name: "Sun Behind Cloud", keywords: ["weather"] },
    { emoji: "⛅", name: "Sun Behind Cloud", keywords: ["partly", "cloudy"] },
    { emoji: "🌧️", name: "Rain", keywords: ["rain", "weather"] },
    { emoji: "⛈️", name: "Thunderstorm", keywords: ["storm", "lightning"] },
    { emoji: "🌨️", name: "Snow", keywords: ["snow", "weather"] },
    { emoji: "🌩️", name: "Lightning", keywords: ["lightning"] },
    { emoji: "🌈", name: "Rainbow", keywords: ["rainbow"] },
    { emoji: "☂️", name: "Umbrella", keywords: ["umbrella", "rain"] },
    { emoji: "💨", name: "Dashing Away", keywords: ["wind", "smoke"] },
    { emoji: "💧", name: "Droplet", keywords: ["drop", "water"] },
    { emoji: "🌊", name: "Water Wave", keywords: ["wave", "ocean"] },
    { emoji: "🔥", name: "Fire", keywords: ["fire", "hot", "lit"] },
    { emoji: "🚗", name: "Car", keywords: ["car"] },
    { emoji: "🚕", name: "Taxi", keywords: ["taxi"] },
    { emoji: "🚙", name: "SUV", keywords: ["suv", "car"] },
    { emoji: "🚌", name: "Bus", keywords: ["bus"] },
    { emoji: "🚎", name: "Trolleybus", keywords: ["bus"] },
    { emoji: "🏎️", name: "Racing Car", keywords: ["race", "car"] },
    { emoji: "🚓", name: "Police Car", keywords: ["police"] },
    { emoji: "🚑", name: "Ambulance", keywords: ["ambulance"] },
    { emoji: "🚒", name: "Fire Engine", keywords: ["fire", "truck"] },
    { emoji: "🚐", name: "Minibus", keywords: ["van"] },
    { emoji: "🚚", name: "Delivery Truck", keywords: ["truck"] },
    { emoji: "🚛", name: "Articulated Lorry", keywords: ["truck"] },
    { emoji: "🚜", name: "Tractor", keywords: ["tractor"] },
    { emoji: "🏍️", name: "Motorcycle", keywords: ["motorcycle"] },
    { emoji: "🚲", name: "Bicycle", keywords: ["bike"] },
    { emoji: "🛴", name: "Kick Scooter", keywords: ["scooter"] },
    { emoji: "🛵", name: "Motor Scooter", keywords: ["scooter"] },
    { emoji: "🚂", name: "Locomotive", keywords: ["train"] },
    { emoji: "🚀", name: "Rocket", keywords: ["rocket", "space"] },
    { emoji: "🛸", name: "Flying Saucer", keywords: ["ufo"] },
    { emoji: "✈️", name: "Airplane", keywords: ["plane", "flight"] },
    { emoji: "🛩️", name: "Small Airplane", keywords: ["plane"] },
    { emoji: "🚁", name: "Helicopter", keywords: ["helicopter"] },
    { emoji: "🛶", name: "Canoe", keywords: ["canoe"] },
    { emoji: "⛵", name: "Sailboat", keywords: ["boat", "sail"] },
    { emoji: "🚤", name: "Speedboat", keywords: ["boat"] },
    { emoji: "🛳️", name: "Passenger Ship", keywords: ["ship"] },
    { emoji: "🚢", name: "Ship", keywords: ["ship"] },
    { emoji: "🚦", name: "Traffic Light", keywords: ["traffic", "light"] },
    { emoji: "🏠", name: "House", keywords: ["house"] },
    { emoji: "🏡", name: "House with Garden", keywords: ["house"] },
    { emoji: "🏢", name: "Office Building", keywords: ["office"] },
    { emoji: "🏣", name: "Post Office", keywords: ["post"] },
    { emoji: "🏤", name: "Post Office", keywords: ["post"] },
    { emoji: "🏥", name: "Hospital", keywords: ["hospital"] },
    { emoji: "🏦", name: "Bank", keywords: ["bank"] },
    { emoji: "🏨", name: "Hotel", keywords: ["hotel"] },
    { emoji: "🏩", name: "Love Hotel", keywords: ["hotel"] },
    { emoji: "🏪", name: "Convenience Store", keywords: ["store"] },
    { emoji: "🏫", name: "School", keywords: ["school"] },
    { emoji: "🏬", name: "Department Store", keywords: ["store"] },
    { emoji: "🏭", name: "Factory", keywords: ["factory"] },
    { emoji: "🏯", name: "Japanese Castle", keywords: ["castle"] },
    { emoji: "🏰", name: "Castle", keywords: ["castle"] },
    { emoji: "💒", name: "Wedding", keywords: ["wedding", "church"] },
    { emoji: "🗼", name: "Tokyo Tower", keywords: ["tokyo", "tower"] },
    { emoji: "🗽", name: "Statue of Liberty", keywords: ["liberty", "nyc"] },
    { emoji: "⛪", name: "Church", keywords: ["church"] },
    { emoji: "🕌", name: "Mosque", keywords: ["mosque"] },
    { emoji: "🛕", name: "Hindu Temple", keywords: ["temple"] },
    { emoji: "🕍", name: "Synagogue", keywords: ["synagogue"] },
    { emoji: "⛩️", name: "Shinto Shrine", keywords: ["shrine"] },
    { emoji: "🕋", name: "Kaaba", keywords: ["kaaba", "mecca"] },
  ],
  "Activities": [
    { emoji: "⚽", name: "Soccer Ball", keywords: ["soccer", "football"] },
    { emoji: "🏀", name: "Basketball", keywords: ["basketball"] },
    { emoji: "🏈", name: "American Football", keywords: ["football"] },
    { emoji: "⚾", name: "Baseball", keywords: ["baseball"] },
    { emoji: "🎾", name: "Tennis", keywords: ["tennis"] },
    { emoji: "🏐", name: "Volleyball", keywords: ["volleyball"] },
    { emoji: "🏉", name: "Rugby", keywords: ["rugby"] },
    { emoji: "🎱", name: "Pool 8 Ball", keywords: ["pool", "billiards"] },
    { emoji: "🏓", name: "Ping Pong", keywords: ["table tennis"] },
    { emoji: "🏸", name: "Badminton", keywords: ["badminton"] },
    { emoji: "🥊", name: "Boxing Glove", keywords: ["boxing"] },
    { emoji: "🥋", name: "Martial Arts", keywords: ["karate"] },
    { emoji: "🥅", name: "Goal Net", keywords: ["goal"] },
    { emoji: "⛳", name: "Flag in Hole", keywords: ["golf"] },
    { emoji: "🎣", name: "Fishing Pole", keywords: ["fishing"] },
    { emoji: "🤿", name: "Diving Mask", keywords: ["diving"] },
    { emoji: "🎽", name: "Running Shirt", keywords: ["running"] },
    { emoji: "🎿", name: "Skis", keywords: ["ski"] },
    { emoji: "🛷", name: "Sled", keywords: ["sled"] },
    { emoji: "🥌", name: "Curling Stone", keywords: ["curling"] },
    { emoji: "🎯", name: "Bullseye", keywords: ["target", "dart"] },
    { emoji: "🪀", name: "Yo-Yo", keywords: ["yoyo"] },
    { emoji: "🪁", name: "Kite", keywords: ["kite"] },
    { emoji: "🎮", name: "Video Game", keywords: ["game", "gaming"] },
    { emoji: "🕹️", name: "Joystick", keywords: ["joystick"] },
    { emoji: "🎲", name: "Dice", keywords: ["dice", "game"] },
    { emoji: "♠️", name: "Spade", keywords: ["spade", "card"] },
    { emoji: "♥️", name: "Heart Suit", keywords: ["heart", "card"] },
    { emoji: "♦️", name: "Diamond Suit", keywords: ["diamond", "card"] },
    { emoji: "♣️", name: "Club", keywords: ["club", "card"] },
    { emoji: "🎴", name: "Flower Playing Cards", keywords: ["cards"] },
    { emoji: "🎭", name: "Performing Arts", keywords: ["theater", "drama"] },
    { emoji: "🎨", name: "Artist Palette", keywords: ["art", "paint"] },
    { emoji: "🎬", name: "Clapper Board", keywords: ["film", "movie"] },
    { emoji: "🎤", name: "Microphone", keywords: ["mic", "sing"] },
    { emoji: "🎧", name: "Headphone", keywords: ["headphones", "music"] },
    { emoji: "🎵", name: "Musical Note", keywords: ["music", "note"] },
    { emoji: "🎶", name: "Musical Notes", keywords: ["music"] },
    { emoji: "🎼", name: "Musical Score", keywords: ["music"] },
    { emoji: "🎹", name: "Musical Keyboard", keywords: ["piano"] },
    { emoji: "🥁", name: "Drum", keywords: ["drum"] },
    { emoji: "🎷", name: "Saxophone", keywords: ["sax"] },
    { emoji: "🎺", name: "Trumpet", keywords: ["trumpet"] },
    { emoji: "🎸", name: "Guitar", keywords: ["guitar"] },
    { emoji: "🎻", name: "Violin", keywords: ["violin"] },
    { emoji: "🎳", name: "Bowling", keywords: ["bowling"] },
    { emoji: "🎪", name: "Circus Tent", keywords: ["circus"] },
    { emoji: "🎟️", name: "Admission Tickets", keywords: ["tickets"] },
    { emoji: "🎫", name: "Ticket", keywords: ["ticket"] },
    { emoji: "🏆", name: "Trophy", keywords: ["trophy", "win"] },
    { emoji: "🥇", name: "Gold Medal", keywords: ["gold", "medal"] },
    { emoji: "🥈", name: "Silver Medal", keywords: ["silver"] },
    { emoji: "🥉", name: "Bronze Medal", keywords: ["bronze"] },
    { emoji: "🏅", name: "Sports Medal", keywords: ["medal"] },
    { emoji: "🎖️", name: "Military Medal", keywords: ["medal"] },
    { emoji: "🎗️", name: "Ribbon", keywords: ["ribbon"] },
    { emoji: "🎀", name: "Bow", keywords: ["ribbon", "bow"] },
    { emoji: "🎁", name: "Gift", keywords: ["gift", "present"] },
    { emoji: "🎊", name: "Confetti Ball", keywords: ["confetti"] },
    { emoji: "🎉", name: "Party Popper", keywords: ["party", "tada"] },
    { emoji: "🎄", name: "Christmas Tree", keywords: ["christmas"] },
    { emoji: "🎃", name: "Jack-O-Lantern", keywords: ["halloween"] },
    { emoji: "🎆", name: "Fireworks", keywords: ["fireworks"] },
    { emoji: "🎇", name: "Sparkler", keywords: ["sparkler"] },
    { emoji: "✨", name: "Sparkles", keywords: ["sparkle", "magic"] },
    { emoji: "🎈", name: "Balloon", keywords: ["balloon"] },
    { emoji: "🎐", name: "Wind Chime", keywords: ["wind", "chime"] },
    { emoji: "🎏", name: "Koi Nobori", keywords: ["carp", "streamer"] },
  ],
  "Objects": [
    { emoji: "📱", name: "Mobile Phone", keywords: ["phone", "iphone", "smartphone"] },
    { emoji: "💻", name: "Laptop", keywords: ["computer", "laptop"] },
    { emoji: "⌨️", name: "Keyboard", keywords: ["keyboard"] },
    { emoji: "🖥️", name: "Desktop", keywords: ["computer"] },
    { emoji: "🖨️", name: "Printer", keywords: ["printer"] },
    { emoji: "🖱️", name: "Mouse", keywords: ["mouse"] },
    { emoji: "💽", name: "Computer Disk", keywords: ["disk"] },
    { emoji: "💾", name: "Floppy Disk", keywords: ["floppy", "save"] },
    { emoji: "💿", name: "Optical Disk", keywords: ["cd", "dvd"] },
    { emoji: "📀", name: "DVD", keywords: ["dvd"] },
    { emoji: "🎥", name: "Movie Camera", keywords: ["camera", "movie"] },
    { emoji: "📷", name: "Camera", keywords: ["camera", "photo"] },
    { emoji: "📸", name: "Camera with Flash", keywords: ["camera"] },
    { emoji: "📹", name: "Video Camera", keywords: ["video", "camera"] },
    { emoji: "🎞️", name: "Film Frames", keywords: ["film"] },
    { emoji: "📞", name: "Telephone Receiver", keywords: ["phone"] },
    { emoji: "☎️", name: "Telephone", keywords: ["phone"] },
    { emoji: "📟", name: "Pager", keywords: ["pager"] },
    { emoji: "📠", name: "Fax Machine", keywords: ["fax"] },
    { emoji: "🔋", name: "Battery", keywords: ["battery"] },
    { emoji: "🪫", name: "Low Battery", keywords: ["battery", "low"] },
    { emoji: "🔌", name: "Plug", keywords: ["plug"] },
    { emoji: "💡", name: "Bulb", keywords: ["light", "idea"] },
    { emoji: "🔦", name: "Flashlight", keywords: ["flashlight"] },
    { emoji: "🕯️", name: "Candle", keywords: ["candle"] },
    { emoji: "💵", name: "Dollar", keywords: ["money", "dollar"] },
    { emoji: "💴", name: "Yen", keywords: ["money", "yen"] },
    { emoji: "💶", name: "Euro", keywords: ["money", "euro"] },
    { emoji: "💷", name: "Pound", keywords: ["money", "pound"] },
    { emoji: "💰", name: "Money Bag", keywords: ["money", "rich"] },
    { emoji: "💳", name: "Credit Card", keywords: ["card", "payment"] },
    { emoji: "🧾", name: "Receipt", keywords: ["receipt"] },
    { emoji: "💎", name: "Gem Stone", keywords: ["diamond", "jewel"] },
    { emoji: "⚖️", name: "Balance Scale", keywords: ["scale", "justice"] },
    { emoji: "🪜", name: "Ladder", keywords: ["ladder"] },
    { emoji: "🔧", name: "Wrench", keywords: ["wrench", "tool"] },
    { emoji: "🔨", name: "Hammer", keywords: ["hammer"] },
    { emoji: "🪛", name: "Screwdriver", keywords: ["screwdriver"] },
    { emoji: "🔩", name: "Nut and Bolt", keywords: ["bolt"] },
    { emoji: "⚙️", name: "Gear", keywords: ["gear", "settings"] },
    { emoji: "🗜️", name: "Clamp", keywords: ["clamp"] },
    { emoji: "🔫", name: "Water Pistol", keywords: ["gun", "water"] },
    { emoji: "🛡️", name: "Shield", keywords: ["shield"] },
    { emoji: "🔪", name: "Kitchen Knife", keywords: ["knife"] },
    { emoji: "🪓", name: "Axe", keywords: ["axe"] },
    { emoji: "🔑", name: "Key", keywords: ["key"] },
    { emoji: "🗝️", name: "Old Key", keywords: ["key"] },
    { emoji: "🔒", name: "Locked", keywords: ["lock", "secure"] },
    { emoji: "🔓", name: "Unlocked", keywords: ["unlock"] },
    { emoji: "🔐", name: "Locked with Key", keywords: ["locked", "secure"] },
    { emoji: "🔏", name: "Locked with Pen", keywords: ["locked"] },
    { emoji: "🔎", name: "Magnifying Glass Right", keywords: ["search", "magnify"] },
    { emoji: "📎", name: "Paperclip", keywords: ["clip"] },
    { emoji: "🖇️", name: "Linked Paperclips", keywords: ["clip"] },
    { emoji: "📏", name: "Straight Ruler", keywords: ["ruler"] },
    { emoji: "📐", name: "Triangular Ruler", keywords: ["ruler"] },
    { emoji: "✂️", name: "Scissors", keywords: ["scissors"] },
    { emoji: "📌", name: "Pushpin", keywords: ["pin"] },
    { emoji: "📍", name: "Round Pushpin", keywords: ["pin"] },
    { emoji: "📝", name: "Memo", keywords: ["memo", "note"] },
    { emoji: "✏️", name: "Pencil", keywords: ["pencil"] },
    { emoji: "🖊️", name: "Pen", keywords: ["pen"] },
    { emoji: "🖋️", name: "Fountain Pen", keywords: ["pen"] },
    { emoji: "📃", name: "Page with Curl", keywords: ["document"] },
    { emoji: "📜", name: "Scroll", keywords: ["scroll"] },
    { emoji: "📄", name: "Page Facing Up", keywords: ["document"] },
    { emoji: "📑", name: "Bookmark Tabs", keywords: ["bookmark"] },
    { emoji: "🔖", name: "Bookmark", keywords: ["bookmark"] },
    { emoji: "📚", name: "Books", keywords: ["books"] },
    { emoji: "📖", name: "Open Book", keywords: ["book"] },
    { emoji: "📕", name: "Closed Book", keywords: ["book"] },
    { emoji: "📦", name: "Package", keywords: ["package", "parcel"] },
    { emoji: "📫", name: "Mailbox", keywords: ["mailbox"] },
    { emoji: "📬", name: "Mailbox with Mail", keywords: ["mailbox"] },
    { emoji: "📪", name: "Mailbox Closed", keywords: ["mailbox"] },
    { emoji: "📮", name: "Postbox", keywords: ["postbox"] },
    { emoji: "✉️", name: "Envelope", keywords: ["mail", "email"] },
    { emoji: "📧", name: "E-Mail", keywords: ["email"] },
    { emoji: "📨", name: "Incoming Envelope", keywords: ["mail"] },
    { emoji: "📩", name: "Envelope with Arrow", keywords: ["mail", "sent"] },
    { emoji: "📤", name: "Outbox Tray", keywords: ["outbox"] },
    { emoji: "📥", name: "Inbox Tray", keywords: ["inbox"] },
    { emoji: "📯", name: "Postal Horn", keywords: ["horn"] },
    { emoji: "📪", name: "Closed Mailbox", keywords: ["mailbox"] },
    { emoji: "📭", name: "Open Mailbox", keywords: ["mailbox"] },
    { emoji: "📰", name: "Newspaper", keywords: ["news"] },
    { emoji: "🗞️", name: "Rolled-Up Newspaper", keywords: ["news"] },
    { emoji: "🏷️", name: "Label", keywords: ["tag", "label"] },
    { emoji: "🔖", name: "Bookmark", keywords: ["bookmark"] },
    { emoji: "🎽", name: "Running Shirt", keywords: ["shirt"] },
    { emoji: "🎫", name: "Ticket", keywords: ["ticket"] },
    { emoji: "🏮", name: "Red Paper Lantern", keywords: ["lantern"] },
  ],
  "Symbols": [
    { emoji: "❤️", name: "Red Heart", keywords: ["heart", "love"] },
    { emoji: "🧡", name: "Orange Heart", keywords: ["heart", "love"] },
    { emoji: "💛", name: "Yellow Heart", keywords: ["heart", "love"] },
    { emoji: "💚", name: "Green Heart", keywords: ["heart", "love"] },
    { emoji: "💙", name: "Blue Heart", keywords: ["heart", "love"] },
    { emoji: "💜", name: "Purple Heart", keywords: ["heart", "love"] },
    { emoji: "🖤", name: "Black Heart", keywords: ["heart", "love"] },
    { emoji: "🤍", name: "White Heart", keywords: ["heart", "love"] },
    { emoji: "🤎", name: "Brown Heart", keywords: ["heart", "love"] },
    { emoji: "💔", name: "Broken Heart", keywords: ["heart", "break"] },
    { emoji: "❣️", name: "Heart Exclamation", keywords: ["heart"] },
    { emoji: "💕", name: "Two Hearts", keywords: ["hearts", "love"] },
    { emoji: "💞", name: "Revolving Hearts", keywords: ["hearts"] },
    { emoji: "💓", name: "Beating Heart", keywords: ["heart"] },
    { emoji: "💗", name: "Growing Heart", keywords: ["heart"] },
    { emoji: "💖", name: "Sparkling Heart", keywords: ["heart", "sparkle"] },
    { emoji: "💘", name: "Heart with Arrow", keywords: ["cupid", "heart"] },
    { emoji: "💝", name: "Heart with Ribbon", keywords: ["heart", "chocolate"] },
    { emoji: "💟", name: "Heart Decoration", keywords: ["heart"] },
    { emoji: "☮️", name: "Peace", keywords: ["peace"] },
    { emoji: "✝️", name: "Cross", keywords: ["cross", "christian"] },
    { emoji: "☪️", name: "Star and Crescent", keywords: ["islam", "muslim"] },
    { emoji: "☸️", name: "Wheel of Dharma", keywords: ["buddhist"] },
    { emoji: "✡️", name: "Star of David", keywords: ["judaism"] },
    { emoji: "🔯", name: "Six Pointed Star", keywords: ["star"] },
    { emoji: "🕉️", name: "Om", keywords: ["hindu", "om"] },
    { emoji: "☦️", name: "Orthodox Cross", keywords: ["cross", "christian"] },
    { emoji: "🛐", name: "Place of Worship", keywords: ["worship"] },
    { emoji: "⛎", name: "Ophiuchus", keywords: ["zodiac"] },
    { emoji: "♈", name: "Aries", keywords: ["zodiac", "aries"] },
    { emoji: "♉", name: "Taurus", keywords: ["zodiac", "taurus"] },
    { emoji: "♊", name: "Gemini", keywords: ["zodiac", "gemini"] },
    { emoji: "♋", name: "Cancer", keywords: ["zodiac", "cancer"] },
    { emoji: "♌", name: "Leo", keywords: ["zodiac", "leo"] },
    { emoji: "♍", name: "Virgo", keywords: ["zodiac", "virgo"] },
    { emoji: "♎", name: "Libra", keywords: ["zodiac", "libra"] },
    { emoji: "♏", name: "Scorpius", keywords: ["zodiac", "scorpio"] },
    { emoji: "♐", name: "Sagittarius", keywords: ["zodiac", "sagittarius"] },
    { emoji: "♑", name: "Capricorn", keywords: ["zodiac", "capricorn"] },
    { emoji: "♒", name: "Aquarius", keywords: ["zodiac", "aquarius"] },
    { emoji: "♓", name: "Pisces", keywords: ["zodiac", "pisces"] },
    { emoji: "🆔", name: "ID", keywords: ["id"] },
    { emoji: "🈳", name: "Vacancy", keywords: ["vacant"] },
    { emoji: "🈹", name: "Discount", keywords: ["sale"] },
    { emoji: "🈴", name: "Passing Grade", keywords: ["pass"] },
    { emoji: "🈺", name: "Open for Business", keywords: ["open"] },
    { emoji: "🈷️", name: "Monthly Amount", keywords: ["monthly"] },
    { emoji: "🈶", name: "Not Free of Charge", keywords: ["fee"] },
    { emoji: "🈚", name: "Free of Charge", keywords: ["free"] },
    { emoji: "🈲", name: "Prohibited", keywords: ["forbidden"] },
    { emoji: "🈵", name: "Full", keywords: ["full"] },
    { emoji: "🈸", name: "Application", keywords: ["apply"] },
    { emoji: "🈂️", name: "Service Charge", keywords: ["sa"] },
    { emoji: "💠", name: "Diamond with a Dot", keywords: ["diamond"] },
    { emoji: "➿", name: "Double Curly Loop", keywords: ["loop"] },
    { emoji: "♻️", name: "Recycling", keywords: ["recycle"] },
    { emoji: "✅", name: "Check Mark", keywords: ["check", "done"] },
    { emoji: "❌", name: "Cross Mark", keywords: ["x", "wrong", "no"] },
    { emoji: "❓", name: "Question Mark", keywords: ["question", "help"] },
    { emoji: "❔", name: "White Question Mark", keywords: ["question"] },
    { emoji: "❗", name: "Exclamation Mark", keywords: ["exclamation", "alert"] },
    { emoji: "❕", name: "White Exclamation", keywords: ["exclamation"] },
    { emoji: "💯", name: "Hundred Points", keywords: ["100", "score"] },
    { emoji: "🔞", name: "No One Under 18", keywords: ["18", "adult"] },
    { emoji: "🚫", name: "Prohibited", keywords: ["no", "stop"] },
    { emoji: "🚭", name: "No Smoking", keywords: ["no smoking"] },
    { emoji: "📛", name: "Name Badge", keywords: ["name", "badge"] },
    { emoji: "🚩", name: "Triangular Flag", keywords: ["flag", "marker"] },
    { emoji: "🎌", name: "Crossed Flags", keywords: ["flags"] },
    { emoji: "🏴", name: "Black Flag", keywords: ["flag"] },
    { emoji: "🏳️", name: "White Flag", keywords: ["flag"] },
    { emoji: "🏳️‍🌈", name: "Rainbow Flag", keywords: ["pride", "lgbt", "rainbow"] },
    { emoji: "🏴‍☠️", name: "Pirate Flag", keywords: ["pirate"] },
    { emoji: "🔴", name: "Red Circle", keywords: ["circle", "red"] },
    { emoji: "🟠", name: "Orange Circle", keywords: ["circle"] },
    { emoji: "🟡", name: "Yellow Circle", keywords: ["circle"] },
    { emoji: "🟢", name: "Green Circle", keywords: ["circle"] },
    { emoji: "🔵", name: "Blue Circle", keywords: ["circle"] },
    { emoji: "🟣", name: "Purple Circle", keywords: ["circle"] },
    { emoji: "🟤", name: "Brown Circle", keywords: ["circle"] },
    { emoji: "⚫", name: "Black Circle", keywords: ["circle"] },
    { emoji: "⚪", name: "White Circle", keywords: ["circle"] },
    { emoji: "🟥", name: "Red Square", keywords: ["square", "red"] },
    { emoji: "🟧", name: "Orange Square", keywords: ["square"] },
    { emoji: "🟨", name: "Yellow Square", keywords: ["square"] },
    { emoji: "🟩", name: "Green Square", keywords: ["square"] },
    { emoji: "🟦", name: "Blue Square", keywords: ["square"] },
    { emoji: "🟪", name: "Purple Square", keywords: ["square"] },
    { emoji: "🟫", name: "Brown Square", keywords: ["square"] },
    { emoji: "⬛", name: "Black Square", keywords: ["square"] },
    { emoji: "⬜", name: "White Square", keywords: ["square"] },
  ],
};

const CATEGORIES = ["Frequent", "Smileys", "Gestures", "People", "Animals", "Food", "Travel", "Activities", "Objects", "Symbols"];
const CATEGORY_ICONS: Record<string, string> = {
  "Frequent": "🕐",
  "Smileys": "😀",
  "Gestures": "👋",
  "People": "👤",
  "Animals": "🐶",
  "Food": "🍔",
  "Travel": "🚀",
  "Activities": "⚽",
  "Objects": "💡",
  "Symbols": "❤️",
};

function getRecentEmojis(): string[] {
  try {
    return JSON.parse(localStorage.getItem("recentEmojis") || "[]");
  } catch { return []; }
}

function addRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem("recentEmojis", JSON.stringify(recent.slice(0, 24)));
  } catch { /* noop */ }
}

function getFrequentEmojis(): string[] {
  try {
    const raw = localStorage.getItem("frequentEmojis");
    if (!raw) return [];
    const data = JSON.parse(raw) as Record<string, number>;
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([e]) => e);
  } catch { return []; }
}

function addFrequentEmoji(emoji: string) {
  try {
    const raw = localStorage.getItem("frequentEmojis");
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    data[emoji] = (data[emoji] || 0) + 1;
    localStorage.setItem("frequentEmojis", JSON.stringify(data));
  } catch { /* noop */ }
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRect?: DOMRect;
}

export default function EmojiPicker({ onSelect, onClose, anchorRect }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Frequent");
  const [skinTone, setSkinTone] = useState(0);
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const recentEmojis = useMemo(() => getRecentEmojis(), []);
  const frequentEmojis = useMemo(() => getFrequentEmojis(), []);

  const currentCategoryData = useMemo(() => {
    if (search.trim()) {
      const query = search.toLowerCase();
      const results: { emoji: string; name: string }[] = [];
      Object.values(EMOJI_DATA).forEach((group) => {
        group.forEach((e) => {
          if (
            e.name.toLowerCase().includes(query) ||
            e.keywords.some((k) => k.includes(query))
          ) {
            results.push({ emoji: e.emoji, name: e.name });
          }
        });
      });
      return results;
    }
    if (category === "Frequent") {
      const combined = [...frequentEmojis.filter((e) => !recentEmojis.includes(e)), ...recentEmojis];
      return combined.map((e) => ({ emoji: e, name: "" }));
    }
    return EMOJI_DATA[category]?.map((e) => ({ emoji: e.emoji, name: e.name })) || [];
  }, [search, category, recentEmojis, frequentEmojis]);

  const applySkinTone = (emoji: string) => {
    if (!skinTone) return emoji;
    const modifier = SKIN_TONES[skinTone];
    const toneableEmojis = new Set(
      Object.values(EMOJI_DATA)
        .flat()
        .filter((e) => e.skinTone)
        .map((e) => e.emoji)
    );
    if (toneableEmojis.has(emoji)) {
      return emoji + modifier;
    }
    return emoji;
  };

  const handleSelect = (emoji: string) => {
    const finalEmoji = applySkinTone(emoji);
    addRecentEmoji(finalEmoji);
    addFrequentEmoji(finalEmoji);
    onSelect(finalEmoji);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const position: React.CSSProperties = useMemo(() => {
    if (!anchorRect) return { bottom: "100%", left: 0, marginBottom: 8 };
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const isRtl = document.documentElement.dir === "rtl";
    const centerOffset = anchorRect.width / 2 - 176;
    if (isRtl) {
      const right = Math.max(8, window.innerWidth - anchorRect.right + centerOffset);
      if (spaceBelow > 400 || spaceBelow > spaceAbove) {
        return { top: anchorRect.bottom + 4, right };
      }
      return { bottom: window.innerHeight - anchorRect.top + 4, right };
    }
    const left = Math.max(8, anchorRect.left + centerOffset);
    if (spaceBelow > 400 || spaceBelow > spaceAbove) {
      return { top: anchorRect.bottom + 4, left };
    }
    return { bottom: window.innerHeight - anchorRect.top + 4, left };
  }, [anchorRect]);

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-[9999] w-[352px] rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        ...position,
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="p-3 pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-transparent outline-none transition-colors placeholder:text-[var(--color-muted)] text-[var(--color-text)]"
            style={{ borderColor: "var(--color-border)", "&:focus": { borderColor: "var(--color-primary)" } } as any}
          />
        </div>
        {!search.trim() && (
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-sm transition-all ${
                  category === cat
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
                }`}
                title={cat}
              >
                {CATEGORY_ICONS[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Emoji Grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
        <div className="p-2 pb-1">
          {(search.trim() && currentCategoryData.length === 0) ? (
            <div className="text-center py-8 text-sm text-[var(--color-muted)]">No emojis found</div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {currentCategoryData.map((item, i) => (
                <button
                  key={`${item.emoji}-${i}`}
                  onClick={() => handleSelect(item.emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-xl hover:bg-[var(--color-hover)] transition-all hover:scale-125 active:scale-90"
                  title={item.name || undefined}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skin Tone Selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="relative">
          <button
            onClick={() => setShowSkinPicker(!showSkinPicker)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-hover)] transition-all text-lg"
          >
            {SKIN_TONES[skinTone] || "✋"}
          </button>
          <AnimatePresence>
            {showSkinPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-xl border shadow-lg"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {SKIN_TONES.map((tone, i) => (
                  <button
                    key={i}
                    onClick={() => { setSkinTone(i); setShowSkinPicker(false); }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-lg ${
                      skinTone === i ? "ring-2 ring-[var(--color-primary)]" : "hover:bg-[var(--color-hover)]"
                    }`}
                  >
                    {tone || "✋"}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-xs text-[var(--color-muted)]">Skin tone</span>
      </div>
    </motion.div>
  );
}
