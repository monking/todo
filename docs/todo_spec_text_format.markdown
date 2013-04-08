Todo Web App: Text Document Specification
=========================================

v0.1.1
2013-04-08


Brief review of v0.1.0
----------------------

The first version of this format is not documented, so while this is not the
first version of the format, it is the first specification. The prior version
of the format is briefly described below.

The Todo document format was based on the Vim Outliner format, using
tab-character indentation to denote hierarchy, The hierarchy is represented in
the diagram below. Comments followed their parent items on the same level of
indentation, with each line of the comment prefixed with a bar and a space,
"| ". Any item may have a comment, but those which were parsed especially are
listed in the diagram.

### Hierarchy

	Schedule
		Today
			Date
			| visual schedule
				Project
					Task
		Next 10 Days
			...
		Rest of the Calendar
			...
	Notes
		Note Subject
		| Note body
	Backlog
		Next
			Category (Client)
				Project
					Task
		Icebox
			...
		Aether
			...
		Inbox
					Task

For the sake of maintaining hierarchy while copying and pasting within the
document, items of the same kind were always on the same indentation level.
This was the reason for the strange jump in indentation in the Inbox.

### Visual Schedule

The visual schedule was laid out on a half-hourly resolution, starting from
midnight. Each event in a schedule could consist of one or more segments of any
type. Further parameters follow the visual segments

- time (optional) 24-hour time to the minute.
- description Any text, including tags.
- reminders (optional) As a comma-separated list, prefixed with an
  exclamation point, of how many minutes before an event start to trigger the
  reminder (e.g. "!15,25").

Event segments had several types, denoted by the first character in a block
(e.g. "|-- ~~?-" denotes a 1.5hr "busy" segment, a half-hour break, 1hr travel,
and a 1hr "maybe" segment).

- Busy: symbol "|"
- Travel: symbol "~" or ">"
- Cancelled: symbol "x"
- Maybe: symbol "?"


Overall Format
==============

Version 0.1.1 of this format is a shift away from the rigid Vim Outliner format
toward the more readable Markdown format. Markdown is not inherently
hierarchical, so basic structure is denoted with headers and keywords, while
further data is implicit or extracted by formatting (such as date). 

Below is an example todo document format in use.

	Calendar
	========
	
	## Today
	
	2013-04-07 Sunday (PST)
	
	| . . : . . | . . : . . | . . : . . | . . : . . | . . : . . 
	                  >|------  |-------- @hspot
					          |- @lunch
							             >|< @market
	
	@home
	// 8:00 take out the garbage  !5

	@hspot
	// layout homepage
	== markup navigation
	xx 15:00 give demonstration
	__ implement framework
	?? hi-res version

	@market
	__ bananas
	__ almonds
	__ eggs
	?? cookies

	@home
	__ bathe the dog
	
	## 10 Days

	2013-04-08 Monday (PST)


	@home
	__ fix faucet


