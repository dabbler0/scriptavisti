gulp = require 'gulp'
coffeeify = require 'gulp-coffeeify'
connect = require 'gulp-connect'

gulp.task 'build', ->
  gulp.src('./src/index.coffee')
    .pipe(coffeeify())
    .pipe(gulp.dest('./build/'))

gulp.task 'connect', ->
  connect.server()

gulp.task 'default', ['build']
