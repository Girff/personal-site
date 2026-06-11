# Hello, world (obligatory)

Every blog has to start with one of these, so let's get it over with.

This is my corner of the internet. It looks like a card game because I think websites are allowed
to be fun, and because I have strong opinions about CRT filters (pro).

## What goes here

Mostly things I'm building, things I'm learning, and the occasional post-mortem when a project
goes sideways in an educational way. Expect game dev stuff, UIL/competitive programming notes,
and whatever else survives the draft folder.

## How this blog works (note to future me)

Posting is intentionally low-tech:

1. Write a markdown file in `blog/posts/`, e.g. `my-new-post.md`
2. Add one entry to `blog/posts.json` with the slug, title, date, summary, and tags
3. Commit and push — GitHub Pages does the rest

No build step, no CMS, no framework. Just files.

```json
{
  "slug": "my-new-post",
  "title": "My New Post",
  "date": "2026-06-11",
  "summary": "One line about it.",
  "tags": ["games"]
}
```

That's the whole pipeline. See you in the next pack.
