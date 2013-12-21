it('Check yate templates are ready [run `make yate` if it fails]', function() {
    expect(yr.run('main', {}, 'check-yate-is-ready')).to.be('Ready');
});
