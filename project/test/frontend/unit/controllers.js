"use strict";

describe('Controllers', function() {
  beforeEach(module('socialApplication'));

  describe('DropdownCtrl', function() {
    var scope;
    var event = {
      preventDefault: function(){},
      stopPropagation: function(){}};
    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');
      $controller('DropdownCtrl', {$scope: scope});
    }));

    it('should toggle', function() {
      expect(scope.status.isopen).toBe(false);
      scope.toggleDropdown(event);
      expect(scope.status.isopen).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});
