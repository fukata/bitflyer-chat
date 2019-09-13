######################################################################
# bitflyerの過去ログページのHTMLを保存する。
######################################################################

Bundler.require

# リンク一覧ページのHTMLを取得する。
def fetch_links_page_html
  unless File.exists?('data/raw/links.html')
    links_url = 'https://crypto-currency-fun.com/bfchat.php'
    response = Faraday.get(links_url)
    unless response.success?
      raise "Can't fetch #{links_url}"
    end
    File.open('data/raw/links.html', 'w') do |f|
      f.puts(response.body)
    end
  end
  IO.read('data/raw/links.html')
end

# チャットログページのURLを抽出する。 
def extract_chat_log_page_urls(links_page_html) 
  urls = []
  
  html = Nokogiri::HTML(links_page_html)
  html.css('#accordionmenu a').each do |node|
    url = node['href']
    if m = url.match(%Q|^/chat/[0-9]{8}chat\.php$|)
      urls.push(m[0])
    end
  end
  
  urls.uniq().sort()
end

# チャットログページのHTMLを保存する。
def save_chat_log_page(url)
  if url.match(/^\//)
    url = "https://crypto-currency-fun.com#{url}"
  end
  puts "save_chat_log_path. url=#{url}"
  response = Faraday.get(url)
  unless response.success?
    raise "Can't fetch #{url}"
  end

  filename = url.split('/').last.gsub('php', 'html')
  File.open("data/raw/#{filename}", 'w') do |f|
    f.puts(response.body)
  end
end

def main
  # データ用ディレクトリを作成
  FileUtils.mkdir_p('data/raw')

  links_page_html = fetch_links_page_html()
  urls = extract_chat_log_page_urls(links_page_html)

  puts "urls.length=#{urls.length}"
  urls.each do |url|
    save_chat_log_page(url)
    sleep(1)
  end
end

main()