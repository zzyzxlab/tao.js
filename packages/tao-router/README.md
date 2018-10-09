# tao-router

## node console testing

```sh
> let re = /\{([\w|\.]+)}/gm
undefined
> re
/\{([\w|\.]+)}/gm
> let path = /{t}/path/{term.id}/{action.go}/
let path = /{t}/path/{term.id}/{action.go}/
           ^

SyntaxError: Invalid regular expression flags

> let url = '/{t}/path/{term.id}/{action.go}/
let url = '/{t}/path/{term.id}/{action.go}/
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

SyntaxError: Invalid or unexpected token

> let earl = '/{t}/path/{term.id}/{action.go}/'
undefined
> earl
'/{t}/path/{term.id}/{action.go}/'
> re.match(earl)
TypeError: re.match is not a function
> re.test(earl)
true
> re.exec(earl)
[ '{term.id}',
  'term.id',
  index: 10,
  input: '/{t}/path/{term.id}/{action.go}/' ]
> re = /\({([\w|\.]+)})*/gm
SyntaxError: Invalid regular expression: /\({([\w|\.]+)})*/: Unmatched ')'
> re = /\({([\w|\.]+)\})*/gm
SyntaxError: Invalid regular expression: /\({([\w|\.]+)\})*/: Unmatched ')'
> re = /(\{([\w|\.]+)\})*/gm
/(\{([\w|\.]+)\})*/gm
> re.exec(earl)
[ '',
  undefined,
  undefined,
  index: 0,
  input: '/{t}/path/{term.id}/{action.go}/' ]
> re = /(\{([\w|\.]+)\})*/gm
/(\{([\w|\.]+)\})*/gm
> re.exec(earl)
[ '',
  undefined,
  undefined,
  index: 0,
  input: '/{t}/path/{term.id}/{action.go}/' ]
> earl.match(re)
[ '',
  '{t}',
  '',
  '',
  '',
  '',
  '',
  '',
  '{term.id}',
  '',
  '{action.go}',
  '',
  '' ]
> earl.split('/')
[ '', '{t}', 'path', '{term.id}', '{action.go}', '' ]
> earl.match(/\//g).length
5
> earl.match(/\//g).length + earl.split('/')
'5,{t},path,{term.id},{action.go},'
> earl.match(/\//g).length + earl.split('/').length
11
> earl.match(re).length
13
> re = /(\{([\w|\.]+)\})/gm
/(\{([\w|\.]+)\})/gm
> earl.match(re)
[ '{t}', '{term.id}', '{action.go}' ]
>
(To exit, press ^C again or type .exit)
>
```
