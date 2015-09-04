#!/usr/bin/ruby
require 'selenium-webdriver'
require 'test/unit'

# Test for chat
class ChatTest < Test::Unit::TestCase
  def setup
    @driver = Selenium::WebDriver.for :firefox
    @driver.get 'http://www-und.ida.liu.se/~frejo105'
  end

  def test_send_empty
    assert_equal(@driver.find_element(:id, 'msgInput').text, '')
    warning = @driver.find_element(:id, 'warning')

    @driver.find_element(:id, 'sendButton').click
    assert_equal(warning.style('display'), 'block')

  end

  def test_send_too_long
    warning = @driver.find_element(:id, 'warning')
    @driver.find_element(:id, 'msgInput').send_keys('a'*141)
    @driver.find_element(:id, 'sendButton').click
    assert_equal(warning.style('display'), 'block')
  end

  def test_simple_send
    message = 'a simple message'
    @driver.find_element(:id, 'msgInput').send_keys(message)
    @driver.find_element(:id, 'sendButton').click

    msg = @driver.find_element(:class, 'messageContainer')
          .find_element(:class, 'messageText')

    assert_equal(message, msg.text)
  end

  def test_send_error_then_correct
    assert_equal(@driver.find_element(:id, 'msgInput').text, '')
    warning = @driver.find_element(:id, 'warning')

    button = @driver.find_element(:id, 'sendButton')

    button.click
    assert_equal(warning.style('display'), 'block')
    @driver.find_element(:id, 'msgInput').send_keys('a')
    button.click
    assert_equal(warning.style('display'), 'none')

    msg = @driver.find_element(:class, 'messageContainer')
          .find_element(:class, 'messageText').text

    assert_equal('a', msg)
  end

  def test_set_read
    @driver.find_element(:id, 'msgInput').send_keys('asd')
    @driver.find_element(:id, 'sendButton').click

    checkbox = @driver.find_element(:css, '[type=checkbox]')
    msg = checkbox.find_element(:xpath, '..').find_element(:xpath, '..')

    # Make sure setting read works
    checkbox.click
    assert(checkbox.attribute('checked'))
    assert(checkbox.attribute('disabled'))
    assert(msg.attribute('class').split(' ').include?('read'))
    assert(!msg.attribute('class').split(' ').include?('unread'))

    # Make sure checkbox is properly disabled and unclickable
    checkbox.click
    assert(checkbox.attribute('checked'))
    assert(checkbox.attribute('disabled'))
  end

  def test_multiple_messages
    messages = ['first message', 'another message', 'third message']

    input = @driver.find_element(:id, 'msgInput')
    send_button = @driver.find_element(:id, 'sendButton')

    messages.each do |msg|
      input.send_keys(msg)
      send_button.click
    end

    # Messages should be found in reverse; first sent message is last element
    texts = @driver.find_elements(:class, 'messageText').reverse
    messages.each_with_index { |msg, i| assert_equal(msg, texts[i].text) }
  end

  def teardown
    @driver.quit
  end
end
