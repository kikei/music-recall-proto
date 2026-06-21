# Music Recall Engine — Concept

A concept document focused on the core ideas.

## Overview

This application does not "store" the experience of listening to music; it
creates the possibility that the experience will be **recalled** again later.
It is a personal music recall engine.

The music it concerns is whatever you encounter through channels such as
Spotify, Kiite, articles, reviews, interviews, or liner notes. While listening,
the impressions and snags that arise are put into words through a dialogue with
an LLM and left behind as small memory fragments that are easy to recall later.

The central idea is "booking a reunion." Rather than simply adding a song or
album you liked to a list, you create a state in which a past listening
experience surfaces again, triggered later by another song, an article, an
artist, a sonic feature, or something you said while listening.

## Purpose

When you listen to a lot of music, the good songs and striking albums get swept
away in the daily flood of information. This application does not aim to
remember all of them, nor to curate a select few.

Its purpose is to tie a thin thread back to the listening experiences that
snagged you strongly, so that you can meet them again later.

To that end it keeps not only the title and artist but a short record of the
sounds you heard, the instruments, the structure, the scene, the background,
and your own reaction. Later, when a connection is found between what you are
listening to or reading now and the past, the application surfaces the past
fragment and presents the reason.

## The core experience

While listening, you type short words the moment something catches your
attention.

Examples:

- "The last track is good."
- "A metallic sound keeps repeating, and it gradually starts to sound like a
  march."
- "The voice isn't the lead so much as mixed into the scenery."
- "Reading this article before listening changed the impression."

The LLM receives the fragment and organizes the sonic features, the background,
and the snag in your listening. After listening, these are compressed into a
short "reunion card."

A reunion card is not a mere review or impression. It is a marker for recalling
that music later.

## The reunion card

The reunion card is the smallest unit that records an encounter with music.

A card holds the following elements.

### Target

The song, album, or object of the listening experience.

### Snag

Why this music stayed with you instead of flowing past. A short note of your own
reaction.

### Recall phrase

A medium-grained, concrete cue that brings the sound or scene back when you read
it later.

Example:

> "A loop of metal cans, a train, a steam whistle, a tuba, a marching band, a
> parade recording. At the end the sound recedes and disappears."

### Background

The context that supports the listening experience, drawn from articles,
interviews, reviews, liner notes, and the LLM's interpretation.

## Recall

The central function of this application is not to list the recorded cards but
to recall them at the right moment.

Recall is triggered by things such as:

- the song you are listening to now,
- something you say while listening,
- an article you are reading,
- an artist or album you recorded before,
- an instrument, sound, structure, or scene that appears in a song,
- a vague input like "this feels like something I've heard before."

The application matches the current trigger against past reunion cards and
surfaces only a few related fragments.

What matters is not simply returning related cards, but explaining **why this
card was recalled now**.

Example:

> "The part of the song you are listening to now, where a field recording shifts
> from repetition into a sense of marching, seems to connect with the card you
> recorded earlier: 'a final track that expands from a loop of metal cans into a
> parade recording.'"

This explanation is what makes the result function as recall rather than as
search.

## The role of the LLM

The LLM is not a recommendation engine; it behaves as a music sommelier.

Its main roles are:

- to receive vague impressions while you listen,
- to convert impressions into words that are easy to recall,
- to organize the sounds, instruments, structure, and scenes in a song,
- to connect the content of articles and interviews to the listening
  experience,
- to compress all of this into a reunion card after listening,
- to recall past cards from the current listening experience,
- to explain why a card was recalled.

The LLM does not write a finished review on your behalf. It builds a verbal
foothold so that you can return to the music again later.

## How the data is framed

The main data this application handles is not the songs themselves but
encounters with music.

Even for the same song, a different way of encountering it can become a
different memory fragment. A song heard via an article, a song that happened to
play, and a song revisited after several years each carry a different context
for recall.

Therefore the central unit of data is not the "song" but the "listening
experience."

A reunion card holds a short body and searchable cues. The body contains your
impression, the LLM's wording, and the background drawn from articles and
reviews.

Recall combines semantic search with metadata.

## The minimal usage flow

You listen to music on Spotify, Kiite, or elsewhere.

The moment something catches you, you type a short impression.

The LLM receives the impression and helps put it into words.

After listening, a reunion card is made from the conversation.

Later, triggered by another song, an article, or something you said, a related
reunion card surfaces.

You read the reason for the recall and, if you wish, reunite with that music.

If the reunion deepens the impression, the card is appended to.

## Summary

This application is not an app for storing music. It is an app that converts
encounters with music into a form that can be recalled again later.

At its center is not the management of songs but the booking of a reunion.

The vague impression you have while listening is put into words through a
dialogue with the LLM and left as a small memory fragment that includes the
sound, the instruments, the background, the scene, and your own reaction.

That fragment surfaces later, triggered by other music, an article, or something
you said. At that moment the application explains why it was recalled just now.

This creates a state in which, rather than carrying every accumulating listening
experience, only the ones that snagged you strongly rise again when you need
them.
