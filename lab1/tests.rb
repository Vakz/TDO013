#!/usr/bin/ruby
require 'selenium-webdriver'
require 'test/unit'

# Test for chat
class ChatTest < Test::Unit::TestCase
  def setup
    @driver = Selenium::WebDriver.for :firefox
    @driver.get 'http://192.168.1.87/~vakz/TDP013_2014/lab1/'
  end

  def test_simple_send
    @driver.find_element(:id, 'msgInput').send_keys('asd')
    @driver.find_element(:id, 'sendButton').click

    msg = @driver.find_element(:class, 'messageContainer')
    msg.find_element(:class, 'messageText')

    assert_equal('asd', msg.text)
  end

  def test_set_read
    @driver.find_element(:id, 'msgInput').send_keys('asd')
    @driver.find_element(:id, 'sendButton').click

    checkbox = @driver.find_element(:css, '[type=checkbox]')

    # Make sure setting read works
    checkbox.click
    assert(checkbox.attribute('checked'))
    assert(checkbox.attribute('disabled'))

    # Make sure checkbox is properly disabled and unclickable
    checkbox.click
    assert(checkbox.attribute('checked'))
    assert(checkbox.attribute('disabled'))
  end

  def teardown
    @driver.quit
  end
end
