---
title: The Analog Hacker Challenge
collection: posts
date: 2025-08-14
tags: conferences, community, silly
---

A couple years ago a friend and former colleague said to me, "you like puzzles and games and stuff, right? How about you make a badge challenge for this conference."

I've been privileged to have attended and spoken at more than [my fair share of conferences and similar events](/events); however, these were almost entirely software development events, and none of them had a "challenge" to earn a badge. But this wasn't for just any conference, it was for [DEFCON 32](https://defcon.org), the largest hacker conference in the world. [Insert obligatory IYKYK statement here.] And further, the badge would be designed for the Office of the National Cyber Director within the White House - yes, **The** White House.

That was Spring, 2024, and I had no idea what I was doing. That said, apparently it went well enough because the same friend asked me design a challenge for another hacker conference, [DistrictCon](https://districtcon.org) in Washington, D.C. in early 2025, and then for DEFCON 33 in the Summer of 2025.

All of this is background, however, because he also asked me to design a challenge for one more event, one that I can't actually talk too much about. This event occurs the day before DEFCON each year. In a classified space. On a military base.

### What is a "badge challenge"?

<a href="https://hackaday.com/2019/09/19/pictorial-guide-to-the-unofficial-electronic-badges-of-def-con-27/" target="_blank"><img src="/images/badges_of_dc27.webp" alt="A table of various electronic badges from DEFCON 27" class="post-left-image"></a>

For those of you that haven't been to DEFCON, BlackHat, DistrictCon, ShmooCon, BSides, or one of the many other hacker events around the world, you may never have encountered "badge life." Essentially, different parts of the conference - vendors, villages, the main conference, or even private individuals - will create a challenge for attendees with the prize being a badge (some cool thing that you put on a lanyard).

Often times the challenges take the form of a "CTF" or "capture the flag" activity. These are digital equivalents of their schoolyard predecessors. Attendees enter the challenge - often times by registering themselves or a team - and have to perform various hacker-type things to find a cryptographic "flag" (often a hexadecimal string).

The hacker activities in a challenge can be all over the place. Anything from log analysis to reverse engineering to privilege escalation on a target machine. Mine tend to be a little more like digital scavenger hunts. You have to find this data or that, maybe decode or decrypt it, use it somewhere else to unlock some other thing.

The only real consistency is that they are intentionally tricky.

### But... in a SCIF?

Now, you might be asking me, "but Jordan, you said you designed one of these for a classified military facility, right? And you surely can't bring laptops or smartphones into a SCIF, right?"

<img src="/images/privacy_hoodie.jpg" alt="A hacker in a hoodie that covers their head and computer screen" class="post-right-image">

And you would be correct. A SCIF (a Sensitive Compartmented Information Facility) has very tight controls, one of which is that the only computers allowed inside are tightly controlled and approved by the government, and generally speaking no one is allowed to bring other electronics in. So how do you create a digital CTF in a SCIF?

The first thing to realize is that **computer science is just math**. Want to argue? Name something in Information Technology that's not math based. Colors on a webpage? Nope, I define those in hexadecimal strings of Red, Green, and Blue that often have mathematically determined contrasts. A cat meme? Nope, an image is just structured data that I can analyze and manipulate. In fact, many images these days are SVG, or scaled vector graphics, and there's an entire branch of mathematics that deals with vectors.

So, if all computer science is just math, then why do we have computers at all? Well, the math that we use for things like data encryption is _very_ intense. For humans to do it by hand would take them hundreds of years. New forms of quantum encryption will take that to yet another level.

### Solvable in a Day

As you read above, I needed this challenge to be able to be solved in a _single day_ because the event was just one day long. So I couldn't make the hackers at this event do so much long division that they couldn't finish - and not so much that they couldn't participate in the other activities on site, as well.

I started thinking about it, and realized that I could just make up a very basic encryption algorithm that they would need to reverse engineer. It wouldn't hold up to a hacker with a computer, but they wouldn't have one!

Of course, there was also some amount of deception involved. Basically, I wanted attendees to have to _find_ the challenge - and I wanted to them to have to work together (more on that in a minute). So, I couldn't just give them some cipher text and the encryption function - I needed to hide some hints.

### Enter the Badge Design

My friend - RoRo, the one who got me into this in the first place - had already created a design for the badge which played a bit on the theme of Don Quixote. The design would be laser etched onto a wooden badge (big shout out to Devo for rushing this out!). I thought that was cool, and I knew I could put some cipher text on this that would fit nicely. But how could I give out the other hints?

He already had a solution for me: the wooden badge would actually be assembled in four layers with a hollow bit inside. Layers one and two would be held together with strong magnets, thus creating a hidden pocket. We put the clues inside the badge, with half of the attendees having one clue, and the other half having the second clue. That forced them to work together to solve the full challenge.

I next turned my attention to the cipher text that would form the border of the front of the badge. At first I just assumed it would be a hexadecimal string, but that wouldn't fit with the design at all. I needed something more ... graphic. I decided to turn to the extended ASCII character set and spent an inordinate amount of time finding exactly ten distinct characters that looked like they could've been some ancient pictograph set. Why ten? Well, remember, computer science is just math! Each character would represent a single digit.

### Solving the Challenge

So, attendees would need to decode the pictographic digits, reverse engineer the encryption function, decrypt the cipher text, then determine the final message - our flag - and tell it to one of the organizers. You'll note that in this case, all attendees already had a badge. Sometimes a "badge challenge" is to earn a new badge, sometimes it's to use the badge you have to solve a puzzle (like at this event).

Now's your chance to try to solve the challenge!

Below is an image of the front of the badge and the text of the two clues given on small slips of paper inside each badge. I'm giving you **clean** versions of the hints - you're welcome. The attendees had clues printed on seed paper which had all sorts of distracting elements and caused some serious grief.

> **No cheating!** You are not allowed to use any electronic devices to solve this one.

Here's the front and inside of the badge (I've covered the name of the event, sorry, had to). Click on the image of the front of the badge for a high res version.

<div>
<a href="/images/badge_front.jpg" target="_blank"><img src="/images/badge_front.jpg" alt="The front of a wooden conference badge with a Don Quixote theme and strange symbols around the outside. The symbols are: ǂ⥜⥜↟ǂ⋉⋉ǂ|╬⥜↟⥜ΠΔ╬|╬⥜Ж∔ǂ↟Ж|Жǂ⋉⥜╬Δ╬|╬⥜Π⥜↟⋉⥜|╬⥜╬⥜↟Δ╬|╬ǂΠǂΠ↟Ж|╬⥜⋉⥜╬" class="post-left-image"></a>
<img src="/images/badge_inside.jpg" alt="The inside of a wooden conference page that shows a hidden compartment with a slip of paper in it" class="post-right-image">
</div>

<p style="clear:both;">One of the clues was:</p>

<pre style='font-family: monospace; font-size: 1.2em;'>
( ǂ + ∔ ) * ⥜ = 8  
⥜<sup>Δ</sup> = ( ǂ + ∔ )<sup>⥜</sup>  
√Δ╬ = Π  
( Π<sup>⥜</sup> ) * Ж = ∔╬⥜  
↟<sup>⋉</sup> = ( ∔<sup>Δ</sup> + ( Π * Ж ) - ǂ⥜ )<sup>⥜</sup>
</pre>

The other clue was:

```
fn encrypt(numbers, key) {
    i = 0
    cipher = ''
    for each digit in numbers {
        next = digit ^ (key[i] * 8)
        cipher += pad(next, 2, '0')
        i = (i >= key.size-1) ? 0 : i+1
    }
    return cipher
}
```

#### Wait, so what's the answer?

You didn't think I was just going to give it up that easy, did you? Find some way to reach out to me if you think you know the answer ... or if you need a hint. I've closed comments on this one to prevent leakage. ;)

### What's next?

Join me at [DistrictCon](https://districtcon.org) in January, 2026, in Washington, D.C. to see my next badge challenge!
